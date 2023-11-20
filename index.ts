import {
  GraphQLOutputType,
  GraphQLSchema
} from 'graphql';
import { Example, determineGraphQLType, exampleMaker } from './util';

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

interface OpenApiOperation {
  post: {
    operationId?: string;
    'x-openai-isConsequential'?: boolean;
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

function createResponseSchema(schemaRef: string): Record<string, any> {
  return {
    '200': {
      description: 'Successful GraphQL response',
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${schemaRef}`
          }
        }
      }
    }
  };
}

function getGraphQLFieldType(schema: GraphQLSchema, operationType: string, fieldName: string): GraphQLOutputType {
  let rootType;
  
  if (operationType === 'query') {
    rootType = schema.getQueryType();
  } else if (operationType === 'mutation') {
    rootType = schema.getMutationType();
  } else {
    throw new Error(`Unknown operation type: ${operationType}`);
  }

  if (!rootType) {
    throw new Error(`Root type for operation ${operationType} not found`);
  }

  const field = rootType.getFields()[fieldName];
  if (!field) {
    throw new Error(`Field ${fieldName} not found in operation ${operationType}`);
  }

  return field.type;
}


export const generateOpenAPISchema = (
  graphQLSchema: GraphQLSchema, 
  options: Partial<OpenApiSchemaOptions> = {}
) => {
  const { serverUrl, title, openapi, version, summary, description, exampleValues } = { ...defaultOptions, ...options };
  const examples = exampleMaker(graphQLSchema, exampleValues);

  let paths: Paths = {};
  let components: { schemas: Record<string, any> } = { schemas: {} };

  for (const [exampleName, exampleData] of Object.entries(examples)) {
    const example = exampleData as Example;

    // Define a schema for each response in the components section
    components.schemas[`${exampleName}Response`] = {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: Object.keys(example.response.data).reduce((acc, key) => {
            const fieldType = getGraphQLFieldType(graphQLSchema, example.operation, key);
            acc[key] = { type: determineGraphQLType(fieldType) };
            return acc;
          }, {} as Record<string, { type: string }>)
        }
      }
    };

    paths[`/${exampleName}`] = {
      post: {
        operationId: exampleName,
        'x-openai-isConsequential': false,
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
        responses: createResponseSchema(`${exampleName}Response`)
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
    paths: paths,
    components: components
  };
};
