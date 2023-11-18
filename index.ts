import { GraphQLSchema, GraphQLObjectType } from 'graphql';

function exampleMaker(schema: GraphQLSchema, exampleValues: any) {
  const typeMap = schema.getTypeMap();
  let examples: Record<string, Example> = {};

  Object.values(typeMap).forEach((type) => {
    if (type instanceof GraphQLObjectType && (type.name === 'Query' || type.name === 'Mutation')) {
      const fields = type.getFields();

      Object.values(fields).forEach((field) => {
        let args = field.args.map(arg => `${arg.name}: $${arg.name}`);
        let vars = field.args.map(arg => `$${arg.name}: ${arg.type}`);
        let operation = type.name === 'Query' ? 'query' : 'mutation';
        let query = `${operation} ${field.name}${vars.length > 0 ? '(' + vars.join(', ') + ')' : ''} { ${field.name}${args.length > 0 ? '(' + args.join(', ') + ')' : ''} }`;

        let exampleVariables = field.args.reduce((acc, arg) => {
          // Default value for the example, adjust as needed
          // @ts-ignore
          acc[arg.name] = exampleValues[arg.name] || 'value';
          return acc;
        }, {});

        examples[`${field.name}Example`] = {
          summary: `Example ${type.name}`,
          value: {
            query: query,
            variables: exampleVariables
          }
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
  exampleValues: object;
}

const defaultOptions: OpenApiSchemaOptions = {
  serverUrl: '/graphql',
  title: 'GraphQL API',
  openapi: '3.0.3',
  version: '1.0.0',
  summary: 'GraphQL Endpoint',
  description: 'Endpoint for all GraphQL queries and mutations',
  exampleValues: {}
};

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
    variables?: Record<string, any>;
    operationName?: string;
  };
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
            type: 'object';
            properties: {
              query: {
                type: 'string';
                example?: string;
              };
              variables?: {
                type: 'object';
                additionalProperties: boolean;
                example?: any;
              };
              operationName?: {
                type: 'string';
                example?: string;
              };
            };
            required: string[];
          };
        };
      };
    };
    responses: {
      [statusCode: string]: {
        description: string;
        content?: {
          [contentType: string]: {
            schema: {
              type: string;
              properties?: {
                [propName: string]: {
                  type: string;
                  // Add other schema properties as needed
                };
              };
              // Add other schema fields as needed
            };
          };
        };
      };
    };
  };
}

type Paths = Record<string, OpenApiOperation>;

export const generateOpenAPISchema = (
  graphQLSchema: any, 
  options: Partial<OpenApiSchemaOptions> = {}
) => {
  const { serverUrl, title, openapi, version, summary, description, exampleValues } = { ...defaultOptions, ...options };
  const examples = exampleMaker(graphQLSchema, exampleValues);

  let paths: Paths = {};

  for (const [exampleName, exampleData] of Object.entries(examples)) {
    const example = exampleData as Example;
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
                  },
                  ...(example.value.variables && {
                    variables: {
                      type: 'object',
                      additionalProperties: true,
                      example: example.value.variables
                    }
                  }),
                  ...(example.value.operationName && {
                    operationName: {
                      type: 'string',
                      example: example.value.operationName
                    }
                  })
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
