import { buildSync } from 'esbuild';
import { Construct } from 'constructs';
import { Resource, TerraformAsset, AssetType } from 'cdktf';
import * as path from 'path';

export interface NodejsFunctionProps {
  handler: string,
  path: string
}

const bundle = (workingDirectory: string) => {
  buildSync({
    entryPoints: ['src/index.ts'],
    platform: 'node',
    target: 'es2018',
    bundle: true,
    format: 'cjs',
    sourcemap: 'external',
    outdir: 'dist',
    absWorkingDir: workingDirectory
  });

  return path.join(workingDirectory, 'dist')
}

export class NodejsFunction extends Resource {
  public readonly handler: string;
  public readonly asset: TerraformAsset;

  constructor(scope: Construct, id: string, props: NodejsFunctionProps) {
    super(scope, id)

    this.handler = props.handler

    const workingDirectory = path.resolve(props.path)
    const distPath = bundle(workingDirectory)

    this.asset = new TerraformAsset(this, "lambda-asset", {
      path: distPath,
      type: AssetType.ARCHIVE, // if left empty it infers directory and file
    });
  }
}

