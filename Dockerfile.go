# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o bbe-server .

FROM alpine:latest

RUN addgroup -S bbe && adduser -S bbe -G bbe

COPY --from=builder /app/bbe-server /bbe-server
COPY --from=builder /app/docs /docs

COPY ./bbe-ui/dist /bbe-ui/dist

EXPOSE 8080

USER bbe

CMD ["/bbe-server"]