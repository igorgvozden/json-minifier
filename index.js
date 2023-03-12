/**
 * we need async as well as sync operations,
 * checking file's existance with async operations can lead to race conditions,
 * and hard to debug errors.
*/
const fsAsync = require('fs/promises');
const fs = require("fs");
const path = require('path');
const input = process.argv;
const data = input[2];
const queue = [];

/**
 * Print Help
 */
const printUsage = () => {
    console.warn('Usages:');
    console.warn('minify-json /path/to/my-file.json');
    console.warn('minify-json /path/to/directory');
};

/**
 * Loop Through Directory of Files
 * @param currentDirPath
 * @param callback
 */
const walk = (currentDirPath, callback) => {
    fs.readdirSync(currentDirPath).forEach(name => {
        const filePath = path.join(currentDirPath, name);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walk(filePath, callback);
        }
    });
};

/**
 * Compress File
 * @param filename
 */
const compress = (filename) => {
    // Make sure this is a JSON file
    if (filename.substr(-5) === '.json') {
        // Open file with UTF8 Encoding
        fsAsync.readFile(filename, 'utf-8')
            .then(fileFound => {
                // Parse JSON file
                return JSON.parse(fileFound);
            })
            .then(json => {
                // Check for Valid JSON Object
                if (typeof json === 'object') {
                    // convert JSON to string
                    const minified = JSON.stringify(json);

                    // Truncate JSON file
                    fsAsync.truncate(filename, 0)
                        .then(
                            // Overwrite JSON file
                            fsAsync.writeFile(filename, minified)
                                .then(console.log('✓ Compressed: ' + filename))
                                .catch(err => console.error('✓ [ERROR] Unable to Save JSON ' + err))
                        );
                } else {
                    console.error('× [ERROR] Invalid JSON File');
                };
            })
            .catch(err => {
                console.error('× [ERROR] unable to read ' + filename);
                console.error(err.message);
            });
    } else {
        // Skip non JSON files
        console.warn('× [NOTICE] Skipping: ' + filename);
    }
};

/**
 * Minify JSON
 * @param data
 */
const minifyJSON = (data) => {
    if (data) {
        // get Stats on data
        const stats = fs.lstatSync(data);

        // Check if a directory was provided
        if (stats.isDirectory()) {
            walk(data, (path) => {
                queue.push(() => compress(path));
            });
            queue.forEach(compressFunction => compressFunction());
        } else {
            // only a single file was passed, so lets just compress it
            return compress(data);
        }
    }
};

/**
 * Check if we have data & that it is either a file of directory
 */
if (data) {
    // Make sure provided data exists
    if (fs.existsSync(data)) {
        minifyJSON(data);
    } else {
        console.error('× [ERROR] Invalid Path Provided');
    }
} else {
    printUsage();
}

module.exports = minifyJSON;
