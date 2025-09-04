const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const filePath = path.join(__dirname, '../frontend/src/data/database.json');

const readDataFromFile = () => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error('Error reading data from bophan.json:', error);
        return [];
    }
};


const writeDataToFile = (data) => {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonData, 'utf8');
    } catch (error) {
        console.error('Error writing data to database.json:', error);
    }
};

exports.getTableAData = (req, res) => {
    try {
        const data = readDataFromFile();
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error retrieving data from database.json:', error);
        res.json({ success: false, error: error.message });
    }
};

exports.deleteTableAData = (req, res) => {
    try {
        const { keys } = req.params;

        const data = readDataFromFile();
        const newData = data.filter(item => item.keys !== keys);

        writeDataToFile(newData);

        res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.json({ success: false, error: error.message });
    }
};

exports.editTableAData = (req, res) => {
    try {
        const { keys } = req.params;
        const { link, title, category, account } = req.body;

        const data = readDataFromFile();
        const updatedData = data.map(item => {
            if (item.keys === keys) {
                return { ...item, link, title, category,account };
            }
            return item;
        });

        writeDataToFile(updatedData);

        res.json({ success: true, message: 'Department edited successfully' });
    } catch (error) {
        console.error('Error editing department:', error);
        res.json({ success: false, error: error.message });
    }
};

exports.addDepartment = (req, res) => {
    try {
        const { link, title, category, account } = req.body;

        const data = readDataFromFile();
        const newID = uuidv4();

        data.push({ keys: newID, link, title, category, account });

        writeDataToFile(data);

        res.json({ success: true, message: 'Department added successfully' });
    } catch (error) {
        console.error('Error adding department:', error);
        res.json({ success: false, error: error.message });
    }
};

exports.getDepartmentById = (req, res) => {
    try {
        const { keys } = req.params;

        const data = readDataFromFile();
        const department = data.find(item => item.keys === keys);

        if (department) {
            res.json({ success: true, data: department });
        } else {
            res.json({ success: false, message: 'Department not found' });
        }
    } catch (error) {
        console.error('Error retrieving department by ID:', error);
        res.json({ success: false, error: error.message });
    }
};