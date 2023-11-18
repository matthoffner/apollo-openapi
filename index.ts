import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLOutputType
} from 'graphql';
import { createScalarMock, determineGraphQLType, isScalarType } from './util';

function createMockResponse(returnType: GraphQLOutputType, fieldName: string): object {
  if (isScalarType(returnType)) {
    return { data: { [fieldName]: createScalarMock(returnType) } };
  }

  // If the returnType is an object type, create a mock object
  if (returnType instanceof GraphQLObjectType) {
    let mockObject: Record<string, any> = {};
    const fields = returnType.getFields();

    for (const [fieldKey, field] of Object.entries(fields)) {
      // For simplicity, assume field types are scalar
      mockObject[fieldKey] = createScalarMock(field.type);
    }

    return { data: mockObject };
  }

  // Fallback for other types (lists, enums, etc.)
  return { data: { [fieldName]: {} } };
}


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
          // @ts-ignore
          acc[arg.name] = exampleValues[arg.name] || 'value'; // Default value
          return acc;
        }, {});
        let mockResponse = createMockResponse(field.type, field.name);

        examples[field.name] = {
          summary: `Example ${type.name}`,
          value: {
            query: query,
            variables: exampleVariables
          },
          response: mockResponse
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


interface Example {
  summary: string;
  value: {
    query: string;
    variables?: Record<string, any>;
    operationName?: string;
  };
  response: any;
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
        // Assuming the response structure is similar to the one in createMockResponse function
        // Update this part to reflect the actual structure of your GraphQL responses
        data: {
          type: 'object',
          properties: Object.keys(example.response.data).reduce((acc, key) => {
            acc[key] = { type: determineGraphQLType(example.response.data[key]) }; // A helper function to determine the type
            return acc;
          }, {} as Record<string, { type: string }>)
        }
      }
    };

    paths[`/${exampleName}`] = {
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
