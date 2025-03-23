// schematics_files.js
const schematic_files = import.meta.glob('./schematics/**/*.schem', {
    eager: true,
    import: 'default',
    query: '?url',
  })
  
  export const SCHEMATICS_FILES_INDEX = Object.fromEntries(
    Object.entries(schematic_files).map(([path, url]) => {
      // Extract the path after 'terrain/' and before '.schem'
      const match = path.match(/schematics\/(.+)\.schem/)
      const relative_path = match ? match[1] : path
      return [relative_path, url]
    }),
  )