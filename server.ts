import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { gql } from 'graphql-tag';

// Function to generate example queries and mutations
function exampleMaker(schema: any) {
    const typeMap = schema.getTypeMap();
    let examples = {};
  
    for (let typeName in typeMap) {
      if (typeName === 'Query' || typeName === 'Mutation') {
        const fields = typeMap[typeName].getFields();
  
        for (let fieldName in fields) {
          const field = fields[fieldName];
          // @ts-ignore
          let args = field.args.map(arg => arg.name + ': ' + JSON.stringify('value'));
          let operation = typeName === 'Query' ? 'query' : 'mutation';
          let exampleValue = {
            query: `${operation} { ${fieldName}${args.length > 0 ? '(' + args.join(', ') + ')' : ''} }`
          };
          // @ts-ignore
          examples[`${fieldName}Example`] = {
            summary: `Example ${typeName}`,
            value: exampleValue
          };
        }
      }
    }
  
    return examples;
}

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
    },
  };



// Create an executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });
const examples = exampleMaker(schema);
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
  const openApiSchema = {
    openapi: '3.0.3',
    info: {
      title: 'GraphQL API',
      version: '1.0.0',
    },
    servers: [{ url: '/graphql' }],
    paths: {
      '/graphql': {
        post: {
          summary: 'GraphQL Endpoint',
          description: 'Endpoint for all GraphQL queries and mutations',
          requestBody: {
            description: 'GraphQL Query or Mutation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: {
                      type: 'string',
                      description: 'GraphQL Query or Mutation'
                    },
                    variables: {
                      type: 'object',
                      additionalProperties: true,
                      description: 'Variables for the query or mutation'
                    }
                  },
                  required: ['query']
                },
                examples: examples
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful GraphQL response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    additionalProperties: true
                  }
                }
              }
            }
          }
        }
      }
    }
  };

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
