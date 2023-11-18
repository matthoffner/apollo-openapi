import {
  GraphQLScalarType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLOutputType,
  GraphQLObjectType,
  GraphQLSchema
} from 'graphql';


export interface Example {
  summary: string;
  value: {
    query: string;
    variables?: Record<string, any>;
    operationName?: string;
  };
  response: any;
}

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

export function exampleMaker(schema: GraphQLSchema, exampleValues: any) {
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


export function createScalarMock(type: GraphQLOutputType): any {
  if (type instanceof GraphQLScalarType || type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    switch (type.toString()) {
      case 'String':
        return 'Sample string';
      case 'Int':
        return 123;
      case 'Float':
        return 123.45;
      case 'Boolean':
        return true;
      default:
        return null;
    }
  }
  return null;
}

export function isScalarType(type: GraphQLOutputType): boolean {
  return (
    type instanceof GraphQLScalarType ||
    (type instanceof GraphQLNonNull && isScalarType(type.ofType)) ||
    (type instanceof GraphQLList && isScalarType(type.ofType))
  );
}

export function determineGraphQLType(type: GraphQLOutputType): string {
  if (type instanceof GraphQLScalarType) {
    switch (type.name) {
      case 'String':
        return 'string';
      case 'Int':
        return 'integer';
      case 'Float':
        return 'number';
      case 'Boolean':
        return 'boolean';
      case 'ID':
        return 'string'; // ID is often represented as a string in OpenAPI
      default:
        return 'unknown';
    }
  } else if (type instanceof GraphQLNonNull) {
    // Non-null type, check the inner type
    return determineGraphQLType(type.ofType);
  } else if (type instanceof GraphQLList) {
    // For lists, you can either return 'array' or handle more specifically
    return 'array';
  }
  // Add handling for other types like enums, objects, etc.
  return 'unknown';
}
