import { Modal, Form, Input, Button, Alert } from 'antd';
import React from 'react';

const PasswordModal = React.memo(({ visible, onCancel, onSubmit, type, name, isRemove = false, isVerify = false }) => {
    const [form] = Form.useForm();

    const title = React.useMemo(() => {
        const typeText = type === 'drive' ? 'ổ đĩa' : type === 'folder' ? 'thư mục' : 'file';
        if (isVerify) {
            return `Nhập mật khẩu để xác thực ${typeText} "${name}"`;
        }
        if (isRemove) {
            return `Xóa mật khẩu cho ${typeText} "${name}"`;
        }
        return `Tạo mật khẩu cho ${typeText} "${name}"`;
    }, [type, name, isVerify, isRemove]);

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
            {isRemove ? (
                <>
                    <Alert
                        message="Cảnh báo"
                        description="Bạn có chắc chắn muốn xóa mật khẩu? Hành động này không thể hoàn tác."
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                    <Button danger type="primary" onClick={() => onSubmit()}>
                        Xóa mật khẩu
                    </Button>
                </>
            ) : (
                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                >
                    <Form.Item
                        name="password"
                        label="Mật khẩu"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {isVerify ? 'Xác nhận' : 'Tạo mật khẩu'}
                        </Button>
                    </Form.Item>
                </Form>
            )}
        </Modal>
    );
});

export default PasswordModal;