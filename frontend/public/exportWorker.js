importScripts('https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js');

self.onmessage = async function (e) {
    const { data, type, queryName, batchSize = 50000 } = e.data;

    try {
        if (type === 'excel') {
            const processDataInBatches = async (data) => {
                const worksheet = XLSX.utils.json_to_sheet([]);

                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize);
                    if (i === 0) {
                        XLSX.utils.sheet_add_json(worksheet, batch, { origin: 0 });
                    } else {
                        XLSX.utils.sheet_add_json(worksheet, batch, { origin: i, skipHeader: true });
                    }

                    self.postMessage({
                        type: 'progress',
                        progress: Math.min(100, Math.round((i + batchSize) * 100 / data.length))
                    });

                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                return worksheet;
            };

            const worksheet = await processDataInBatches(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

            const excelBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array',
                compression: true
            });

            self.postMessage({
                success: true,
                data: excelBuffer,
                filename: `${queryName}_${new Date().getTime()}.xlsx`,
                type: 'excel'
            });

        } else if (type === 'json') {
            const processJsonInBatches = async (data) => {
                let jsonString = '[';

                for (let i = 0; i < data.length; i += batchSize) {
                    const batch = data.slice(i, i + batchSize);
                    jsonString += (i > 0 ? ',' : '') + batch.map(item => JSON.stringify(item)).join(',');

                    self.postMessage({
                        type: 'progress',
                        progress: Math.min(100, Math.round((i + batchSize) * 100 / data.length))
                    });

                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                jsonString += ']';
                return jsonString;
            };

            const jsonString = await processJsonInBatches(data);
            const jsonBlob = new Blob([jsonString], { type: 'application/json' });

            self.postMessage({
                success: true,
                data: await jsonBlob.arrayBuffer(),
                filename: `${queryName}_${new Date().getTime()}.json`,
                type: 'json'
            });
        }
    } catch (error) {
        self.postMessage({
            success: false,
            error: error.message
        });
    }
}; 