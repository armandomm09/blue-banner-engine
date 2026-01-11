package config

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	ConfigFile        string
	TBAAPIKey         string
	GRPCServerAddress string
	SwaggerHost       string
	Production        bool
	CertPath          string
	KeyPath           string
}

func Load() (*Config, error) {
	args := os.Args[1:]
	configPath, configExplicit := configPathFromArgs(args)
	if configPath != "" {
		if _, err := os.Stat(configPath); err != nil {
			if configExplicit {
				return nil, fmt.Errorf("config file %s not found", configPath)
			}
		} else if err := godotenv.Load(configPath); err != nil {
			return nil, fmt.Errorf("load config file %s: %w", configPath, err)
		}
	}

	grpcDefault := envString("GRPC_SERVER_ADDRESS", "localhost:50051")
	swaggerDefault := envString("SWAGGER_HOST", "localhost:8080")
	productionDefault, err := envBool("PRODUCTION")
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		ConfigFile:        configPath,
		TBAAPIKey:         os.Getenv("TBA_API_KEY"),
		GRPCServerAddress: grpcDefault,
		SwaggerHost:       swaggerDefault,
		Production:        productionDefault,
		CertPath:          os.Getenv("CERT_PATH"),
		KeyPath:           os.Getenv("KEY_PATH"),
	}

	flagSet := flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	flagSet.SetOutput(io.Discard)

	flagSet.StringVar(&cfg.ConfigFile, "config", cfg.ConfigFile, "Path to a .env config file")
	flagSet.StringVar(&cfg.TBAAPIKey, "tba-api-key", cfg.TBAAPIKey, "TBA API key")
	flagSet.StringVar(&cfg.GRPCServerAddress, "grpc-server-address", cfg.GRPCServerAddress, "Address of the gRPC server")
	flagSet.StringVar(&cfg.SwaggerHost, "swagger-host", cfg.SwaggerHost, "Swagger host value")
	flagSet.BoolVar(&cfg.Production, "production", cfg.Production, "Run in production mode")
	flagSet.StringVar(&cfg.CertPath, "cert-path", cfg.CertPath, "TLS certificate path (required in production)")
	flagSet.StringVar(&cfg.KeyPath, "key-path", cfg.KeyPath, "TLS key path (required in production)")

	if err := flagSet.Parse(args); err != nil {
		return nil, err
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	var issues []string
	if c.GRPCServerAddress == "" {
		issues = append(issues, "GRPC_SERVER_ADDRESS is required")
	}
	if c.SwaggerHost == "" {
		issues = append(issues, "SWAGGER_HOST is required")
	}
	if c.Production {
		if c.CertPath == "" {
			issues = append(issues, "CERT_PATH is required when PRODUCTION is true")
		}
		if c.KeyPath == "" {
			issues = append(issues, "KEY_PATH is required when PRODUCTION is true")
		}
	}
	if len(issues) > 0 {
		return errors.New(strings.Join(issues, "; "))
	}
	return nil
}

func envString(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envBool(key string) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return false, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, fmt.Errorf("invalid %s value %q: %w", key, value, err)
	}
	return parsed, nil
}

func configPathFromArgs(args []string) (string, bool) {
	for i := 0; i < len(args); i++ {
		arg := args[i]
		switch {
		case strings.HasPrefix(arg, "--config="):
			return strings.TrimPrefix(arg, "--config="), true
		case strings.HasPrefix(arg, "-config="):
			return strings.TrimPrefix(arg, "-config="), true
		case arg == "--config" || arg == "-config":
			if i+1 < len(args) {
				return args[i+1], true
			}
		}
	}
	return ".env", false
}
