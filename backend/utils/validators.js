exports.validatePhoneNumber = (phone) => {
    // E.164 format validation
    const regex = /^\+[1-9]\d{1,14}$/;
    return regex.test(phone);
  };
  
  exports.sanitizeMessage = (text) => {
    // Remove sensitive patterns
    return text.replace(/(\d{4}-\d{4}-\d{4}-\d{4})/g, '****-****-****-****');
  };