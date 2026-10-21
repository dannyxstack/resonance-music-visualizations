FROM golang:1.27-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags='-s -w' -o /server .
FROM alpine:3.21
RUN addgroup -S app && adduser -S -G app app
COPY --from=build /server /server
USER app
EXPOSE 8080
CMD ["/server"]
