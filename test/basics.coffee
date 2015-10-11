di = require '../src/iNGector'

describe 'Dependency chain', ->
	it 'Should invoke blocks by dependency needs', (done) ->
		_invoked = []
		_di = do di
		_di
			.provide 'A', ->
				_invoked.push 'A'
				do Promise.resolve
			.provide 'B', 'A', ->
				_invoked.push 'B'
				do Promise.resolve
			.provide 'C', 'B', ->
				_invoked.push 'C'
				do Promise.resolve
			.provide 'D', 'F', 'C', 'B', ->
				_invoked.push 'D'
				do Promise.resolve
			.provide 'E', 'D', ->
				_invoked.push 'E'
				do Promise.resolve
			.provide 'F', 'A', ->
				_invoked.push 'F'
				do Promise.resolve
			.start()
			.then ->
				_invoked[0].should.be.exactly 'A'
				_invoked[4].should.be.exactly 'D'
				_invoked[5].should.be.exactly 'E'
				do done
			.catch done

	it 'Should reject with "Dependency not found" exception when a config dependency is not found', (done) ->
		_di = do di
		_di
			.provide 'A', 'not-registered-dependency', -> do Promise.resolve
			.start()
			.then ->
				done 'Got resolved'
			.catch (error) ->
				error.should.startWith '[iNGector] Error running configuration blocks'
				error.should.endWith 'Dependency not found (not-registered-dependency)'
				do done

	it 'Should reject with "Dependency not found" exception when a init dependency is not found', (done) ->
		_di = do di
		_di
			.init 'not-registered-dependency', -> ''
			.start()
			.then ->
				done 'Finished'
			.catch (error) ->
				error.should.startWith '[iNGector] Error running init blocks'
				error.should.endWith 'Dependency not found (not-registered-dependency)'
				do done

	it 'Should reject when could not load requested files', (done) ->
		_di = do di
		_di
			.loadFiles 'file-that-does-not-exists'
			.start()
			.then ->
				done 'Finished'
			.catch (error) ->
				error.should.startWith '[iNGector] Error loading files'
				do done