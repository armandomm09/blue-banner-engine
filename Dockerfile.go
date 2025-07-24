FROM golang:1.23-alpine AS builder

WORKDIR /

COPY go.mod go.sum ./
RUN go mod download

COPY . .

COPY .env .env

COPY ./docs /docs


RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bbe-server .

FROM alpine:latest

RUN addgroup -S bbe && adduser -S bbe -G bbe

COPY --from=builder /bbe-server /bbe-server

COPY ./bbe-ui/dist /bbe-ui/dist

COPY --from=builder /docs /docs

EXPOSE 8080

USER bbe

CMD ["/bbe-server"]