import AuthScreen from '@/components/AuthScreen';

const highlights = [
  {
    icon: 'ti-shield-check',
    title: 'Set up your store profile',
    text: 'Capture the basics now so the account is ready for billing later.',
  },
  {
    icon: 'ti-user-plus',
    title: 'Suitable starter details',
    text: 'Name, business info, email, phone, and password fit this project well.',
  },
];

export default function RegisterPage() {
  return (
    <AuthScreen
      brandTitle="Merchant Console"
      brandTagline="Manage your storefront, anytime anywhere."
      leftPanelKicker="Merchant Console"
      leftPanelTitle="Manage your storefront, anytime anywhere."
      leftPanelSubtitle="Sign in to your Merchant console. Track settlements, manage POS terminals, and turn live data into smarter decisions, all in one place."
      eyebrow="Let’s create your account!"
      title="Create your account"
      subtitle=""
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkHref="/login"
      highlights={highlights}
    >
      <form className="space-y-3.5">
        <div>
          <label htmlFor="register-first-name" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            First Name
          </label>
          <input
            id="register-first-name"
            type="text"
            placeholder="Enter your First Name"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="register-last-name" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="register-last-name"
            type="text"
            placeholder="Enter your Last Name"
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:bg-white"
          />
        </div>

        <div>
          <label htmlFor="register-phone" className="mb-1.5 block text-[12px] font-medium text-gray-700">
            Phone Number
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-blue-400 focus-within:bg-white">
            <span className="text-[13px] font-semibold text-gray-500">+91</span>
            <input
              id="register-phone"
              type="tel"
              placeholder="Enter your Phone Number"
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">OTP will be sent to this number</p>
        </div>

        <label className="flex items-start gap-3 text-[12px] leading-5 text-gray-600">
          <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <span>
            By signing up on QueueBuster, you are agreeing to our Terms of Use and Privacy Policy
          </span>
        </label>

        <button
          type="button"
          className="w-full rounded-2xl bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
        >
          Send OTP
        </button>
      </form>
    </AuthScreen>
  );
}