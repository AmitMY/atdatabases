import PgConfig from '@databases/pg-config';
import PgDataTypeID from '@databases/pg-data-type-id';
import type {Schema} from '@databases/pg-schema-introspect';
import {getIgnoreTest, writeFiles} from '@databases/shared-print-types';
import PgPrintContext from './PgPrintContext';
import getTypeScriptType from './getTypeScriptType';
import PrintOptions from './PgPrintOptions';
import printSchemaInner from './printers/printSchema';

const GENERATED_STATEMENT = 'Generated by: @databases/pg-schema-print-types';

export {PgDataTypeID};
export type Options = Omit<Partial<PgConfig['types']>, 'directory'>;

function filterSchema(unfilteredSchema: Schema, options: Options): Schema {
  const isTableIgnored = getIgnoreTest(options);
  const ignoredClassIds = new Set(
    unfilteredSchema.classes
      .filter((c) => isTableIgnored(c.className))
      .map((c) => c.classID),
  );
  return {
    ...unfilteredSchema,
    classes: unfilteredSchema.classes
      .filter((c) => !ignoredClassIds.has(c.classID))
      .map((c) => ({
        ...c,
        constraints: c.constraints.filter(
          (c) =>
            !ignoredClassIds.has(c.classID) &&
            (c.referencedClassID === 0 ||
              !ignoredClassIds.has(c.referencedClassID)),
        ),
      })),
  };
}

function getPrinter(unfilteredSchema: Schema, options: Options) {
  const schema = filterSchema(unfilteredSchema, options);
  const context = new PgPrintContext(
    getTypeScriptType,
    schema,
    new PrintOptions(options),
  );
  printSchemaInner(schema, context);
  return context.printer;
}

export function printSchema(schema: Schema, options: Options = {}) {
  return getPrinter(schema, options).getFiles();
}

export async function writeSchema(
  schema: Schema,
  directory: string,
  options: Options = {},
) {
  await writeFiles({
    context: getPrinter(schema, options),
    directory,
    generatedStatement: GENERATED_STATEMENT,
  });
}
