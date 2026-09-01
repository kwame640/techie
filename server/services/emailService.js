// Log business registration data
export const sendBusinessRegistrationEmail = async (businessData) => {
  try {
    console.log('Business registration received:', {
      businessName: businessData.businessName,
      businessCategory: businessData.businessCategory,
      email: businessData.email,
      phone: businessData.phone,
      city: businessData.city,
      region: businessData.region,
    });
    return { success: true, message: 'Registration logged' };
  } catch (error) {
    console.error('Error logging registration:', error);
    return { success: true, message: 'Registration processed' };
  }
};
