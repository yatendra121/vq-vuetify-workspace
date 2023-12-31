import path from 'path'
import fs from 'fs/promises'
//import { readFileSync } from "fs";

import dts from 'rollup-plugin-dts'
//import alias from "@rollup/plugin-alias";
import fg from 'fast-glob'
import mm from 'micromatch'

const importMap = {
    components: {
        VqTextField: {
            from: 'components/VqTextField.tsx',
            styles: []
        },
        VqAutocomplete: {
            from: 'components/VqAutocomplete.tsx',
            styles: []
        },
        VqTextarea: {
            from: 'components/VqTextarea.tsx',
            styles: []
        },
        VqCheckbox: {
            from: 'components/VqCheckbox.tsx',
            styles: []
        },
        VqForm: {
            from: 'components/VqForm.tsx',
            styles: []
        }
    }
}

const externalsPlugin = () => ({
    resolveId(source, importer) {
        if (importer && (source.endsWith('.sass') || source.endsWith('.scss'))) {
            return {
                id: source,
                external: true,
                moduleSideEffects: false
            }
        }
    }
})

function createTypesConfig(input, output, renderChunk, filter) {
    input = 'temp-types/' + input
    let files = fg.sync(input)

    if (filter) files = filter(files)
    console.log({ files, input, output, renderChunk, filter })

    return files.map((file) => {
        const outputFile = output.replace('*', mm.capture(input, file)[0])
        return {
            input: file,
            output: [{ file: outputFile, format: 'es' }],
            plugins: [
                dts(),
                externalsPlugin(),
                // alias({
                //   entries: [
                //     {
                //       find: /^@\/(.*)/,
                //       replacement: path.resolve(__dirname, "../types-temp/$1"),
                //     },
                //   ],
                // }),
                {
                    async renderChunk(code) {
                        if (renderChunk) code = await renderChunk(code)
                        return code.replaceAll(
                            /import([^;])*?from 'vue-router'/gm,
                            '// @ts-ignore\n$&'
                        )
                    }
                }
            ]
        }
    })
}

async function getShims() {
    const components = Object.keys(importMap.components)
        .map((name) => `    ${name}:  ${name}`)
        .join('\n')

    return (
        await fs.readFile(path.resolve('../vq-vuetify/src/shims.d.ts'), {
            encoding: 'utf8'
        })
    )
        .replace(/^\s+\/\/ @skip-build\s+.*$/gm, '')
        .replace(/^\s+\/\/ @generate-components$/gm, components)
}

export default [
    // createTypesConfig("framework.d.ts", "lib/index.d.ts", async (code) => {
    //   return code + "\n\n" + (await getShims());
    // }),
    createTypesConfig('index.d.ts', 'dist/index.d.ts', async (code) => {
        return code + '\n\n' + (await getShims())
    }),
    createTypesConfig('integrations.d.ts', 'dist/integrations.d.ts')
    // createTypesConfig("main.d.ts", "dist/index.d.ts", async (code) => {
    //   console.log("importMap.components");

    //   return (
    //     code +
    //     "\n\n" +
    //     (await getShims()).replace(", VNodeChild } from 'vue'", " } from 'vue'")
    //   );
    // }),
    //createTypesConfig("integrations.d.ts", "dist/index.d.ts"),
    // createTypesConfig("components/index.d.ts", "lib/components/index.d.ts"),
    // createTypesConfig(
    //   "components/*/index.d.ts",
    //   "lib/components/*/index.d.ts",
    //   undefined,
    //   (files) => {
    //     const index = readFileSync(
    //       path.resolve(__dirname, "../src/components/index.ts"),
    //       { encoding: "utf8" }
    //     );
    //     const block = Array.from(
    //       index.matchAll(/^\/\/ export \* from '\.\/(.*)'$/gm),
    //       (m) => m[1]
    //     );
    //     return files.filter(
    //       (file) => !block.some((name) => file.includes(`/${name}/`))
    //     );
    //   }
    // ),
    // createTypesConfig("directives/index.d.ts", "lib/directives/index.d.ts"),
    // createTypesConfig("locale/index.d.ts", "lib/locale/index.d.ts"),
    // createTypesConfig("locale/adapters/*.d.ts", "lib/locale/adapters/*.d.ts"),
    // createTypesConfig("iconsets/*.d.ts", "lib/iconsets/*.d.ts"),
].flat()
