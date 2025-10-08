#!/bin/bash
# Local OpenSearch management script

case "$1" in
  start)
    echo "Starting local OpenSearch..."
    docker-compose up -d
    echo "Waiting for OpenSearch to be ready..."
    sleep 10
    curl -s http://localhost:9200 && echo -e "\n✓ OpenSearch is running"
    ;;
  stop)
    echo "Stopping local OpenSearch..."
    docker-compose down
    ;;
  restart)
    $0 stop
    $0 start
    ;;
  logs)
    docker-compose logs -f opensearch
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs}"
    exit 1
    ;;
esac
