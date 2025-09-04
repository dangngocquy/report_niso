const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getDrives = (req, res) => {
    if (process.platform === 'win32') {
        exec('wmic logicaldisk get caption,volumename,size,freespace', (error, stdout) => {
            if (error) {
                res.status(500).send(error);
                return;
            }
            
            const lines = stdout.split('\n').filter(line => line.trim());
            lines.shift(); 

            const drives = lines.map(line => {
                const parts = line.trim().split(/\s+/);
                const driveLetter = parts[0];
                const volumeName = parts[1] || '';
                const totalSize = parseInt(parts[2]) || 0;
                const freeSpace = parseInt(parts[3]) || 0;
                const usedSpace = totalSize > freeSpace ? totalSize - freeSpace : 0;
                
                return {
                    name: volumeName ? `${driveLetter} (${volumeName})` : driveLetter,
                    path: driveLetter + '\\',
                    totalSize: formatBytes(totalSize),
                    freeSpace: formatBytes(freeSpace),
                    usedSpace: formatBytes(usedSpace),
                    totalSizeRaw: totalSize,
                    freeSpaceRaw: freeSpace,
                    usedSpaceRaw: usedSpace,
                    status: 'Bình thường'
                };
            }).filter(drive => drive.totalSize !== '0 Bytes' && drive.name);

            res.json(drives);
        });
    } else {
        const root = { name: '/', path: '/' };
        res.json([root]);
    }
};

const getDirectoryContents = async (req, res) => {
    const dirPath = req.query.path;
    try {
        const exists = await fs.pathExists(dirPath);
        if (!exists) {
            return res.status(404).send('Đường dẫn không tồn tại');
        }

        const contents = await fs.readdir(dirPath);
        const items = await Promise.all(
            contents
                .filter(item => {
                    const systemItems = [
                        'System Volume Information',
                        '$Recycle.Bin',
                        'Config.Msi'
                    ];
                    return !item.startsWith('$') && !systemItems.includes(item);
                })
                .map(async (item) => {
                    try {
                        const fullPath = path.join(dirPath, item);
                        const stats = await fs.stat(fullPath);
                        
                        return {
                            name: item,
                            path: fullPath,
                            type: stats.isDirectory() ? 'folder' : 'file',
                            size: formatBytes(stats.size),
                            rawSize: stats.size,
                            modifiedDate: stats.mtime,
                            isAccessible: true
                        };
                    } catch (error) {
                        return {
                            name: item,
                            path: path.join(dirPath, item),
                            type: 'unknown',
                            size: 'N/A',
                            rawSize: 0,
                            modifiedDate: new Date(),
                            isAccessible: false,
                            error: error.message
                        };
                    }
                })
        );

        const validItems = items.filter(item => item !== null);
        validItems.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });

        res.json(validItems);
    } catch (error) {
        console.error('Lỗi đọc thư mục:', error);
        res.status(500).send(error.message);
    }
};

const readFileContent = async (req, res) => {
    const filePath = req.query.path;
    try {
        const exists = await fs.pathExists(filePath);
        if (!exists) {
            return res.status(404).send('File không tồn tại');
        }

        const stats = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase();

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
        if (imageExtensions.includes(ext)) {
            const data = await fs.readFile(filePath);
            
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.bmp': 'image/bmp',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
            };

            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.send(data);
        }

        const MAX_SIZE = 50 * 1024 * 1024;
        if (stats.size > MAX_SIZE) {
            return res.status(413).json({
                error: 'File quá lớn',
                message: 'Không thể đọc file lớn hơn 50MB',
                size: formatBytes(stats.size)
            });
        }

        try {
            const content = await fs.readFile(filePath, 'utf8');
            res.json({
                content: content,
                size: formatBytes(stats.size)
            });
        } catch (utf8Error) {
            const content = await fs.readFile(filePath, 'latin1');
            res.json({
                content: content,
                size: formatBytes(stats.size)
            });
        }
    } catch (error) {
        console.error('Lỗi đọc file:', error);
        res.status(500).json({
            error: 'Lỗi đọc file',
            message: error.message
        });
    }
};

const searchFiles = async (req, res) => {
    const { searchPath, keyword } = req.query;
    
    try {
        const results = [];
        const systemDirs = [
            'System Volume Information',
            '$Recycle.Bin',
            'Config.Msi',
            'Documents and Settings',
            'Recovery',
            'Program Files',
            'Program Files (x86)',
            'Windows',
            'ProgramData',
            'AppData',
            'Boot',
            'Intel',
            'PerfLogs',
            'System32',
            'WindowsApps'
        ];

        const isSystemPath = (pathToCheck) => {
            return systemDirs.some(dir => 
                pathToCheck.includes(dir) || 
                pathToCheck.toLowerCase().includes('system') ||
                pathToCheck.toLowerCase().includes('$')
            );
        };
        
        async function searchRecursive(currentPath, depth = 0) {
            if (depth > 10) return;
            
            try {
                if (isSystemPath(currentPath)) {
                    return;
                }

                const items = await fs.readdir(currentPath);
                
                for (const item of items) {
                    if (item.startsWith('.') || isSystemPath(item)) continue;
                    
                    const fullPath = path.join(currentPath, item);
                    try {
                        const stats = await fs.stat(fullPath);
                        
                        if (item.toLowerCase().includes(keyword.toLowerCase())) {
                            results.push({
                                name: item,
                                path: fullPath,
                                type: stats.isDirectory() ? 'folder' : 'file',
                                size: formatBytes(stats.size),
                                rawSize: stats.size,
                                modifiedDate: stats.mtime
                            });
                        }
                        
                        if (stats.isDirectory()) {
                            await searchRecursive(fullPath, depth + 1);
                        }
                    } catch (error) {
                        continue;
                    }
                }
            } catch (error) {
                return;
            }
        }
        
        await searchRecursive(searchPath);
        
        results.sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type === 'folder' ? -1 : 1;
        });
        
        res.json(results);
    } catch (error) {
        console.error('Lỗi tìm kiếm:', error);
        res.status(500).send('Có lỗi xảy ra khi tìm kiếm');
    }
};

const runningBatFiles = new Map();

const executeFile = async (req, res) => {
    const filePath = req.query.path;
    const action = req.query.action;
    
    try {
        const exists = await fs.pathExists(filePath);
        if (!exists) {
            return res.status(404).send('File không tồn tại');
        }

        if (!filePath.toLowerCase().endsWith('.bat')) {
            return res.status(400).send('Không phải là file .bat hợp lệ');
        }

        const workingDir = path.dirname(filePath);
        const fileName = path.basename(filePath);

        if (action === 'start') {
            if (runningBatFiles.has(filePath)) {
                return res.json({
                    success: true,
                    isRunning: true,
                    message: 'File đang chạy'
                });
            }

            const process = exec(`cmd.exe /c start /min cmd.exe /c "${filePath}"`, {
                cwd: workingDir,
                windowsHide: false
            });

            runningBatFiles.set(filePath, {
                process: process,
                fileName: fileName,
                pid: process.pid
            });

            res.json({
                success: true,
                isRunning: true,
                message: 'File đ được thực thi thành công'
            });

        } else if (action === 'stop') {
            const processInfo = runningBatFiles.get(filePath);
            if (processInfo) {
                try {
                    exec('tasklist /v /fo csv', (error, stdout) => {
                        if (error) {
                            console.error('Lỗi khi lấy danh sách process:', error);
                            return res.json({
                                success: false,
                                isRunning: true,
                                message: 'Không thể dừng tiến trình'
                            });
                        }

                        const lines = stdout.split('\n');
                        const cmdProcesses = lines
                            .filter(line => {
                                const processLine = line.toLowerCase();
                                return processLine.includes('cmd.exe') && 
                                       processLine.includes(fileName.toLowerCase());
                            });

                        if (cmdProcesses.length > 0) {
                            cmdProcesses.forEach(processLine => {
                                try {
                                    const pid = processLine.split(',')[1].replace(/"/g, '');
                                    exec(`taskkill /F /T /PID ${pid}`, (killError) => {
                                        if (killError) {
                                            console.log(`Lỗi khi tắt PID ${pid}:`, killError);
                                        }
                                    });
                                } catch (e) {
                                    console.error('Lỗi khi xử lý process:', e);
                                }
                            });

                            setTimeout(() => {
                                runningBatFiles.delete(filePath);
                                res.json({
                                    success: true,
                                    isRunning: false,
                                    message: 'File đã được dừng thành công'
                                });
                            }, 1000);
                        } else {
                            exec(`taskkill /F /IM cmd.exe /FI "WINDOWTITLE eq *${fileName}*"`, () => {
                                runningBatFiles.delete(filePath);
                                res.json({
                                    success: true,
                                    isRunning: false,
                                    message: 'File đã được dừng thành công'
                                });
                            });
                        }
                    });
                } catch (error) {
                    console.error('Lỗi khi dừng tiến trình:', error);
                    res.json({
                        success: false,
                        isRunning: true,
                        message: 'Không thể dừng tiến trình'
                    });
                }
            } else {
                res.json({
                    success: false,
                    isRunning: false,
                    message: 'File không đang chạy'
                });
            }
        } else if (action === 'status') {
            res.json({
                success: true,
                isRunning: runningBatFiles.has(filePath)
            });
        }
    } catch (error) {
        console.error('Lỗi:', error);
        res.status(500).send(error.message);
    }
};

const saveFileContent = async (req, res) => {
    const { path, content } = req.body;
    
    try {
        const exists = await fs.pathExists(path);
        if (!exists) {
            return res.status(404).send('File không tồn tại');
        }

        await fs.writeFile(path, content, 'utf8');
        res.json({
            success: true,
            message: 'Đã lưu file thành công'
        });
    } catch (error) {
        console.error('Lỗi lưu file:', error);
        res.status(500).send(error.message);
    }
};

const createFolder = async (req, res) => {
    const { path, folderName } = req.body;
    
    try {
        const newFolderPath = path.endsWith('\\') ? 
            `${path}${folderName}` : 
            `${path}\\${folderName}`;

        const exists = await fs.pathExists(newFolderPath);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'Thư mục đã tồn tại'
            });
        }

        await fs.mkdir(newFolderPath);
        res.json({
            success: true,
            message: 'Đã tạo thư mục thành công'
        });
    } catch (error) {
        console.error('Lỗi tạo thư mục:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const createFile = async (req, res) => {
    const { path, fileName, content = '' } = req.body;
    
    try {
        const newFilePath = path.endsWith('\\') ? 
            `${path}${fileName}` : 
            `${path}\\${fileName}`;

        const exists = await fs.pathExists(newFilePath);
        if (exists) {
            return res.status(400).json({
                success: false,
                message: 'File đã tồn tại'
            });
        }

        await fs.writeFile(newFilePath, content);
        res.json({
            success: true,
            message: 'Đã tạo file thành công'
        });
    } catch (error) {
        console.error('Lỗi tạo file:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const deleteItem = async (req, res) => {
    const { path } = req.body;
    
    try {
        const exists = await fs.pathExists(path);
        if (!exists) {
            return res.status(404).json({
                success: false,
                message: 'File/thư mục không tồn tại'
            });
        }

        const stats = await fs.stat(path);
        if (stats.isDirectory()) {
            await fs.remove(path);
        } else {
            await fs.unlink(path);
        }

        res.json({
            success: true,
            message: `Đã xóa ${stats.isDirectory() ? 'thư mục' : 'file'} thành công`
        });
    } catch (error) {
        console.error('Lỗi khi xóa:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const checkPassword = async (req, res) => {
    const { path: filePath, keys, password } = req.body;

    try {
        const passwordFilePath = path.join(__dirname, 'path_passwords.json');
        if (!await fs.pathExists(passwordFilePath)) {
            return res.json({ hasPassword: false, isAuthorized: true });
        }

        const fileContent = await fs.readFile(passwordFilePath, 'utf8');
        const passwords = JSON.parse(fileContent);

        if (!passwords[filePath]) {
            return res.json({ hasPassword: false, isAuthorized: true });
        }

        // Kiểm tra xem người dùng có phải là người đặt mật khẩu không
        const isOwner = passwords[filePath].authorizedKeys === keys;

        // Kiểm tra session authorization
        const sessionAuth = req.session?.authorizedPaths?.[filePath];
        
        if (sessionAuth) {
            return res.json({
                hasPassword: true,
                isAuthorized: true,
                isOwner,
                type: passwords[filePath].type,
                lockedByKey: passwords[filePath].authorizedKeys
            });
        }

        // Nếu có gửi mật khẩu lên để xác thực
        if (password) {
            const isPasswordCorrect = passwords[filePath].password === password;
            
            if (isPasswordCorrect) {
                // Lưu authorization vào session
                if (!req.session.authorizedPaths) {
                    req.session.authorizedPaths = {};
                }
                req.session.authorizedPaths[filePath] = true;
            }

            return res.json({
                hasPassword: true,
                isAuthorized: isPasswordCorrect,
                isOwner,
                type: passwords[filePath].type,
                lockedByKey: passwords[filePath].authorizedKeys
            });
        }

        return res.json({
            hasPassword: true,
            isAuthorized: false,
            isOwner,
            type: passwords[filePath].type,
            lockedByKey: passwords[filePath].authorizedKeys
        });
    } catch (error) {
        console.error('Lỗi khi kiểm tra mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể kiểm tra mật khẩu'
        });
    }
};

const savePasswordToJson = async (req, res) => {
    const { path: filePath, password, keys } = req.body;
    const timestamp = new Date().toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    try {
        const passwordFilePath = path.join(__dirname, 'path_passwords.json');
        let passwords = {};

        if (await fs.pathExists(passwordFilePath)) {
            const fileContent = await fs.readFile(passwordFilePath, 'utf8');
            passwords = JSON.parse(fileContent);
        }

        passwords[filePath] = {
            password,
            timestamp,
            type: filePath.includes('.') ? 'file' : 'folder',
            authorizedKeys: [keys]
        };

        await fs.writeFile(passwordFilePath, JSON.stringify(passwords, null, 2));

        res.json({
            success: true,
            message: 'Đã lưu mật khẩu thành công'
        });
    } catch (error) {
        console.error('Lỗi khi lưu mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể lưu mật khẩu'
        });
    }
};

const removePassword = async (req, res) => {
    const { path: filePath } = req.body;

    try {
        const passwordFilePath = path.join(__dirname, 'path_passwords.json');
        if (!await fs.pathExists(passwordFilePath)) {
            return res.json({ success: false, message: 'Không tìm thấy file mật khẩu' });
        }

        const fileContent = await fs.readFile(passwordFilePath, 'utf8');
        let passwords = JSON.parse(fileContent);

        if (passwords[filePath]) {
            delete passwords[filePath];
            await fs.writeFile(passwordFilePath, JSON.stringify(passwords, null, 2));
            res.json({
                success: true,
                message: 'Đã xóa mật khẩu thành công'
            });
        } else {
            res.json({
                success: false,
                message: 'Không tìm thấy mật khẩu cho đường dẫn này'
            });
        }
    } catch (error) {
        console.error('Lỗi khi xóa mật khẩu:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa mật khẩu'
        });
    }
};

module.exports = {
    getDrives,
    getDirectoryContents,
    readFileContent,
    searchFiles,
    executeFile,
    saveFileContent,
    createFolder,
    createFile,
    deleteItem,
    checkPassword,
    savePasswordToJson,
    removePassword
};
