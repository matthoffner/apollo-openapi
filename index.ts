import { GraphQLSchema, GraphQLObjectType } from 'graphql';

function exampleMaker(schema: GraphQLSchema) {
  const typeMap = schema.getTypeMap();
  let examples: Record<string, Example> = {};

  Object.values(typeMap).forEach((type) => {
    if (type instanceof GraphQLObjectType && (type.name === 'Query' || type.name === 'Mutation')) {
      const fields = type.getFields();

      Object.values(fields).forEach((field) => {
        let args = field.args.map(arg => `${arg.name}: ${JSON.stringify('value')}`);
        let operation = type.name === 'Query' ? 'query' : 'mutation';
        let exampleValue = {
          query: `${operation} { ${field.name}${args.length > 0 ? '(' + args.join(', ') + ')' : ''} }`
        };

        examples[`${field.name}Example`] = {
          summary: `Example ${type.name}`,
          value: exampleValue
        };
      });
    }
  });

  return examples;
}

interface OpenApiSchemaOptions {
  serverUrl: string;
  title: string;
  openapi: string;
  version: string;
  summary: string;
  description: string;
}

const defaultOptions: OpenApiSchemaOptions = {
  serverUrl: '/graphql',
  title: 'GraphQL API',
  openapi: '3.0.3',
  version: '1.0.0',
  summary: 'GraphQL Endpoint',
  description: 'Endpoint for all GraphQL queries and mutations'
};

const createRequestBodySchema = (examples: any) => ({
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
});

const createResponseSchema = () => ({
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
});

interface Example {
  summary: string;
  value: {
    query: string;
  }
}

interface OpenApiOperation {
  post: {
    summary: string;
    description: string;
    requestBody: {
      description: string;
      required: boolean;
      content: {
        'application/json': {
          schema: {
            type: string;
            properties: {
              query: {
                type: string;
                example: string;
              };
              // Add other properties if needed
            };
            required: string[];
          };
        };
      };
    };
    responses: any;
  };
}

type Paths = Record<string, OpenApiOperation>;

export const generateOpenAPISchema = (
  graphQLSchema: any, 
  options: Partial<OpenApiSchemaOptions> = {}
) => {
  const { serverUrl, title, openapi, version, summary, description } = { ...defaultOptions, ...options };
  const examples = exampleMaker(graphQLSchema);

  let paths: Paths = {};

  for (const [exampleName, exampleData] of Object.entries(examples)) {
    const example = exampleData as Example
    const path = `/${exampleName}`;
    paths[path] = {
      post: {
        summary: example.summary,
        description: `Example for ${exampleName}`,
        requestBody: {
          description: `Request for ${exampleName}`,
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    example: example.value.query
                  }
                },
                required: ['query']
              }
            }
          }
        },
        responses: createResponseSchema()
      }
    };
  }

  return {
    openapi,
    info: {
      title,
      version,
    },
    servers: [{ url: serverUrl }],
    paths: paths
  };
};
