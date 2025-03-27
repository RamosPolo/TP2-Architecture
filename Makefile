start:
	@echo "Starting server logistic on port 8000..."
	@PORT=8000 node Logistic/server.js &
	@echo "Starting server plant on port 8081..."
	@PORT=8081 node Plant/plantServer.js &

stop:
	@echo "Stopping servers..."
	@pkill -f "node server.js"

restart: stop start

.PHONY: start stop restart