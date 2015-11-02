module.exports = (di) ->
	di.provide 'SOME-MODULE', 'A', ->
		Promise.resolve { name: 'some-module' }
	.init 'A', ->
		# do nothing