iNGector = ->
	_self = this
	_startCalled = no
	_initialized = no

	_provideBlocks = {}
	_initBlocks = []

	_orderChain = (items) ->
		_result = []

		visit = (i) ->
			return if i.visited
			i.visited = true
			for j in i.dependencies or []
				d = (items.filter (s) -> s.name is j)[0]

				throw "Dependency not found (#{j})" if not d?

				visit d
			_result.push i

		while items.length > _result.length
			visit (items.filter (s) -> !s.visited)[0]

		_result

	_executeProvideBlocks = ->
		new Promise (resolve, reject) ->
			_provideChain = []

			for name, block of _provideBlocks
				_provideChain.push
					name: name
					dependencies: block.dependencies

			_orderedChain = _orderChain _provideChain

			_configPromise = do Promise.resolve
			for block in _orderedChain
				_configPromise = _configPromise.then ((blockName) ->
					->
						_block = _provideBlocks[blockName]
						_block
							.func
							.apply _block, (_provideBlocks[d].result for d in _block.dependencies)
							.then (result) ->
								_block.result = result if result?
							.catch (error) ->
								reject error
				) block.name

			_configPromise.then -> do resolve

	_executeInitBlocks = ->
		new Promise (resolve, reject) ->
			_promises = []
			for block in _initBlocks
				_dependencies = []
				for d in block.dependencies
					_dependency = _provideBlocks[d]
					throw "Dependency not found (#{d})" if not _dependency?
					_dependencies.push _dependency.result

				_promises.push block.func.apply block, _dependencies

			Promise
				.all _promises
				.catch (error) -> reject error
				.then -> do resolve

	@checkInitialization = ->
		throw '[iNGector] Already initialized!' if _initialized

	@provide = (name, dependencies..., func) ->
		do _self.checkInitialization

		_provideBlocks[name] =
			dependencies: dependencies
			func: func

		_self

	@init = (dependencies..., func) ->
		do _self.checkInitialization

		_initBlocks.push
			dependencies: dependencies
			func: func

		_self

	@resolve = (name) ->
		throw "[iNGector] Cannot get #{name}. iNGector is not initialized yet!" if not _initialized
		throw "[iNGector] Block #{name} not provided!" if not _provideBlocks[name]

		_provideBlocks[name].result

	@start = ->
		_checkPromise = new Promise (resolve, reject) ->
			do _self.checkInitialization
			throw '[iNGector] Start already called!' if _startCalled
			do resolve

		_checkPromise.then ->
			_startCalled = yes

			_initPromise = do Promise.resolve
			_initPromise = do _self.preInit if _self.preInit?

			_initPromise
				.then _executeProvideBlocks
				.catch (error) ->
					Promise.reject if error.startsWith? '[iNGector]' then error else "[iNGector] Error running provide blocks: \r\n#{error} \r\n#{error.stack}"
				.then _executeInitBlocks
				.catch (error) ->
					Promise.reject if error.startsWith? '[iNGector]' then error else "[iNGector] Error running init blocks: \r\n#{error} \r\n#{error.stack}"
				.then ->
					_initialized = yes
					_self

	_self

if window?
	window.di = new iNGector
else
	fs = require 'fs'

	module.exports = ->
		_baseDir = ''
		_di = new iNGector

		_loadPromise = do Promise.resolve

		_createFilePromise = (file) ->
			new Promise (resolve, reject) ->
				fs.stat file, (error, stats) ->
					if error.code
						reject error
					else if not stats.isDirectory()
						module = require "#{_baseDir}/#{file}"
						module _di

					do resolve
					return
				return

		_loadFile = (file) ->
			->
				_createFilePromise file

		_loadDir = (dir) ->
			->
				new Promise (resolve, reject) ->
					fs.readdir dir, (error, files) ->
						if error?
							reject error
						else
							resolve ("#{dir}/#{file}" for file in files)

		_di.setBaseDir = (baseDir) ->
			_baseDir = baseDir
			_di

		_di.loadFiles = (files...) ->
			do _di.checkInitialization

			for file in files
				_loadPromise = _loadPromise.then _loadFile file

			_di

		_di.loadDirs = (dirs...) ->
			do _di.checkInitialization

			for dir in dirs
				_loadPromise = _loadPromise
					.then _loadDir dir
					.then (files) ->
						Promise.all (_createFilePromise file for file in files)

			_di

		_di.preInit = ->
			_loadPromise.catch (error) ->
				Promise.reject "[iNGector] Error loading files: \r\n#{error} \r\n#{error.stack}"

		_di
