import PaymentsDashboard from '../components/PaymentsDashboard';

const Profile = () => {
  const userPhone = '2547XXXXXXXX'; // Fetch from user data (auth/session)

  return (
    <div>
      <h2 className="text-4xl font-bold text-center mt-6">Welcome to Your Profile</h2>
      <PaymentsDashboard phone={userPhone} />
    </div>
  );
};
