# Define ports to check and stop
PORTS := 3001 3002 3003 3004

# Stop servers on these ports
stop_ports = $(foreach port,$(PORTS),\
  lsof -t -i:$(port) | grep -q . && lsof -t -i:$(port) | xargs kill -9 || echo "No server running on port $(port)";)

start:
	@echo "Stopping servers on ports $(PORTS) if running..."
	@$(stop_ports)
	@echo "Starting server logistic on port 3001..."
	@PORT=3001 node Logistic/server.js &
	@echo "Starting server plant on port 3003..."
	@PORT=3003 node Plant/plantServer.js &
	@echo "Opening the public index page..."
	# Open the browser on the public index page (replace with the actual path if necessary)
	@xdg-open http://localhost:3001/
	@xdg-open http://localhost:3003/

stop:
	@echo "Stopping servers..."
	@pkill -f "node server.js"

restart: stop start

.PHONY: start stop restart
