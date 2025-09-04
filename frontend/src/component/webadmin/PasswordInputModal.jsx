import { Modal, Form, Input, Button } from 'antd';
import React from 'react';

const PasswordInputModal = React.memo(({ visible, onCancel, onSubmit, type, name }) => {
    const [form] = Form.useForm();

    const title = React.useMemo(() => {
        const typeText = type === 'drive' ? 'ổ đĩa' : type === 'folder' ? 'thư mục' : 'file';
        return `Nhập mật khẩu để truy cập ${typeText} "${name}"`;
    }, [type, name]);

    const handleSubmit = React.useCallback((values) => {
        onSubmit(values);
        form.resetFields();
    }, [onSubmit, form]);

    return (
        <Modal
            title={title}
            open={visible}
            onCancel={onCancel}
            footer={null}
        >
            <Form
                form={form}
                onFinish={handleSubmit}
                layout="vertical"
            >
                <Form.Item
                    name="password"
                    label="Mật khẩu"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu' }
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit">
                        Xác nhận
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
});

export default PasswordInputModal;