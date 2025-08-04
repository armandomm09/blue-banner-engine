tmux kill-server

tmux new-session -d -s go_api 'go run main.go'

tmux new-session -d -s python_server 'source .venv/bin/activate && python3 -m matchpoint.server'

tmux new-session -d -s webpageserver 'cd bbe-ui && npm run dev'