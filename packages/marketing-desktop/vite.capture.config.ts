import {defineConfig} from 'vite'
export default defineConfig({root:'src/capture',base:'./',resolve:{dedupe:['react','react-dom','blockly']},build:{outDir:'../../dist/capture',emptyOutDir:true}})
