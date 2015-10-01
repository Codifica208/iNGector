describe 'Dependency chain', ->
	it 'Should invoke blocks by dependency needs', (done) ->
		_invoked = []
		_di = require '../src/iNGector'
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