// src/clients/analytics_client.go

package clients

import (
	pb "blue-banner-engine/protos/analytics" // Asegúrate de que la ruta de importación sea correcta
	"log"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// NewAnalyticsClient crea y devuelve un nuevo cliente para el servicio gRPC Analytics.
func NewAnalyticsClient(address string) pb.AnalyticsClient {
	// Establece una conexión con el servidor gRPC de Python.
	conn, err := grpc.Dial(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to gRPC server at %s: %v", address, err)
	}

	log.Printf("Successfully connected to Analytics gRPC service at %s", address)

	// Crea un nuevo cliente gRPC usando la conexión.
	return pb.NewAnalyticsClient(conn)
}
