import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'graphql-tag';
import { generateOpenAPISchema } from '.';


const exampleValues: Record<string, any> = {
  message: 'Hello world!',
};

// Define your type definitions (GraphQL schema)
const typeDefs = gql`
  type Query {
    hello: String
  }

  type Mutation {
    updateMessage(message: String!): String
  }
`;

// Define your resolvers
const resolvers = {
    Query: {
      hello: () => 'Hello world!',
    },
    Mutation: {
        // @ts-ignore
      updateMessage: (_, { message }): string => {
        return `Updated message: ${message}`;
      },
    }
};
  
// Custom Swagger UI configuration
const swaggerOptions = {
    swaggerOptions: {
      requestInterceptor: (req: any) => {
        req.headers['Content-Type'] = 'application/json';
        // Add any other necessary headers here
        return req;
      },
    }
};


// Create an executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Initialize Apollo Server with the schema
const server = new ApolloServer({ schema });

// Initialize Express
const app = express();
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));

// Start Apollo Server
async function startServer() {
  await server.start();

  // Apply Apollo Server middleware to Express
  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({ /* your context here */ }),
  }));

  // Manually define OpenAPI JSON
  const openApiSchema = generateOpenAPISchema(schema, { exampleValues });

  // Serve Swagger UI for OpenAPI documentation
  // @ts-ignore
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSchema, swaggerOptions));

  // Express route to serve OpenAPI JSON
  app.get('/openapi.json', (req, res) => {
    res.json(openApiSchema);
  });

  // Start the Express server
  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 OpenAPI JSON available at http://localhost:${PORT}/openapi.json`);
    console.log(`🚀 Swagger UI docs available at http://localhost:${PORT}/docs`);
  });
}

startServer();
