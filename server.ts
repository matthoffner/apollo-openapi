import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import cors from 'cors';
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

const routeMap = {
  'hello': {
    tags: {
      name: 'hello-endpoint',
      description: 'Product facing description for endpoint'
    }
  },
  'updateMessage': {
    tags: {
      name: 'updateMessage-endpoint',
      description: 'Product facing description for endpoint'
    }
  }
}
  
// Custom Swagger UI configuration
const swaggerOptions = {
    swaggerOptions: {
      requestInterceptor: (req: any) => {
        req.headers['Content-Type'] = 'application/json';
        // Add any other necessary headers here
        return req;
      },
    },
    customCss: '.swagger-ui .topbar { display: none }'
};

// Create an executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Initialize Apollo Server with the schema
const server = new ApolloServer({ schema });

// Initialize Express
const corsOptions = {
  origin: ['http://localhost:4000', 'https://chat.openai.com'],
  methods: ['GET', 'POST']
};
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

const PORT = 4000;

// Start Apollo Server
async function startServer() {
  await server.start();

  // Apply Apollo Server middleware to Express
  app.use('/graphql', expressMiddleware(server, {
    context: async ({ req }) => ({ /* your context here */ }),
  }));

  // Manually define OpenAPI JSON
  const openApiSchema = generateOpenAPISchema(schema, { exampleValues, routeMap });

  // Serve Swagger UI for OpenAPI documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSchema, swaggerOptions));

  // Express route to serve OpenAPI JSON
  app.get('/openapi.json', (req, res) => {
    res.json(openApiSchema);
  });

  // Start the Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`🚀 OpenAPI JSON available at http://localhost:${PORT}/openapi.json`);
    console.log(`🚀 Swagger UI docs available at http://localhost:${PORT}/docs`);
  });
}

startServer();