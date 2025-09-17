# Keneta E-commerce Platform

A modern, full-featured e-commerce web application built with React and Vite, integrated with Bagisto backend. This project provides a complete online shopping experience with advanced features like address management, wishlist, product comparison, and more.

## 🚀 Features

### 🛍️ **Core E-commerce Features**

- **Product Catalog** - Browse products with advanced filtering and search
- **Product Details** - Detailed product pages with image galleries and reviews
- **Shopping Cart** - Add/remove items with quantity management
- **Checkout System** - Complete checkout flow with address management
- **User Authentication** - Login/register with JWT token authentication
- **Order Management** - Track orders and view order history

### 🎯 **Advanced Features**

- **Address Management** - Save and manage multiple addresses
- **Wishlist** - Save favorite products for later
- **Product Comparison** - Compare multiple products side-by-side
- **Product Reviews** - Read and write product reviews
- **Coupon System** - Apply discount coupons during checkout
- **PDF Generation** - Download wishlist and invoices as PDF
- **GDPR Compliance** - Data protection and privacy controls
- **Responsive Design** - Mobile-first, fully responsive UI

### 🎨 **UI/UX Features**

- **Modern Design** - Clean, professional interface with Tailwind CSS
- **Theme Customization** - Dynamic color theming from API
- **Loading States** - Smooth loading animations and skeleton screens
- **Error Handling** - Comprehensive error handling with user feedback
- **Toast Notifications** - Real-time feedback for user actions
- **Image Optimization** - Automatic image fallbacks and lazy loading

## 🛠️ **Technology Stack**

### **Frontend**

- **React 19** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Flowbite React** - UI component library

### **State Management**

- **TanStack Query** - Server state management and caching
- **React Context** - Global state management for auth, wishlist, etc.
- **Local Storage** - Persistent data storage

### **HTTP & API**

- **Axios** - HTTP client for API requests
- **JWT Authentication** - Secure token-based authentication
- **CSRF Protection** - Cross-site request forgery protection

### **Additional Libraries**

- **React Icons** - Icon library
- **Lucide React** - Additional icon components
- **React Image Gallery** - Product image galleries
- **React Slick** - Carousel components
- **Swiper** - Touch slider
- **jsPDF** - PDF generation
- **html2canvas** - HTML to canvas conversion
- **MirageJS** - API mocking for development

## 📁 **Project Structure**

```
keneta/
├── public/                 # Static assets
├── src/
│   ├── api/               # API configuration and hooks
│   │   ├── auth.js        # Authentication API
│   │   ├── checkout.js    # Checkout API
│   │   ├── customer.js    # Customer API
│   │   ├── customerCheckout.js # Customer checkout API
│   │   └── config.js      # API configuration
│   ├── components/        # Reusable UI components
│   │   ├── account/       # Account-related components
│   │   ├── Home/          # Homepage components
│   │   ├── AddressForm.jsx
│   │   ├── AddressSelector.jsx
│   │   ├── CartSummary.jsx
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── ...
│   ├── context/           # React Context providers
│   │   ├── AuthContext.jsx
│   │   ├── WishlistContext.jsx
│   │   ├── CompareContext.jsx
│   │   └── ToastContext.jsx
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   │   ├── account/       # Protected account pages
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── ProductDetails.jsx
│   │   ├── Checkout.jsx
│   │   └── ...
│   ├── routes/            # Route configuration
│   ├── utils/             # Utility functions
│   ├── assets/            # Images and static assets
│   ├── App.jsx            # Main app component
│   └── main.jsx           # App entry point
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## 🚀 **Getting Started**

### **Prerequisites**

- Node.js (v18 or higher)
- npm or yarn
- Access to the Bagisto backend API

### **Installation**

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd keneta
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:

   ```env
   VITE_API_BASE_URL=https://admin.keneta-ks.com/api
   VITE_INVOICE_PDF_PATH_TEMPLATE=/customer/invoices/{id}/pdf
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

### **Build for Production**

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🔧 **Configuration**

### **API Configuration**

The app connects to a Bagisto backend API. Update the API endpoints in `src/api/config.js`:

```javascript
export const API_ROOT = DEV ? "" : "https://admin.keneta-ks.com/api";
export const API_V1 = `${API_ROOT}/v2`;
export const API_CART = `${API_ROOT}`;
```

### **Theme Customization**

The app supports dynamic theming through CSS variables. Colors are loaded from the API endpoint:

```
GET /api/custom-settings/colors
```

### **Environment Variables**

- `VITE_API_BASE_URL` - Backend API base URL
- `VITE_INVOICE_PDF_PATH_TEMPLATE` - PDF download template path

## 📱 **Key Features Explained**

### **Address Management System**

- **Saved Addresses** - Users can save multiple addresses
- **Address Selection** - Visual card-based address selection
- **Form Autofill** - Automatic form filling for logged-in users
- **Separate Shipping** - Different billing and shipping addresses

### **Checkout Flow**

1. **Address Selection** - Choose from saved addresses or enter new
2. **Shipping Options** - Select shipping method
3. **Payment Methods** - Choose payment option
4. **Order Confirmation** - Review and place order

### **Product Management**

- **Advanced Filtering** - Filter by category, price, brand, etc.
- **Search Functionality** - Real-time product search
- **Product Comparison** - Compare multiple products
- **Wishlist** - Save products for later

### **User Account**

- **Profile Management** - Update personal information
- **Order History** - View past orders and invoices
- **GDPR Compliance** - Data protection controls
- **Product Reviews** - Write and manage reviews

## 🎨 **Styling & Design**

### **Design System**

- **Color Scheme** - Dynamic colors loaded from API
- **Typography** - Host Grotesk font family
- **Components** - Consistent component library
- **Responsive** - Mobile-first design approach

### **CSS Architecture**

- **Tailwind CSS** - Utility-first styling
- **Custom CSS Variables** - Dynamic theming
- **Component Styling** - Scoped component styles
- **Responsive Design** - Mobile-first approach

## 🔐 **Authentication & Security**

### **JWT Authentication**

- Token-based authentication
- Automatic token refresh
- Secure API communication
- Protected routes

### **Security Features**

- CSRF protection
- Input validation
- XSS prevention
- Secure HTTP headers

## 📊 **State Management**

### **TanStack Query**

- Server state management
- Automatic caching
- Background updates
- Optimistic updates

### **React Context**

- Global state management
- Authentication state
- Wishlist state
- Compare state
- Toast notifications

## 🧪 **Development**

### **Available Scripts**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### **Code Quality**

- ESLint configuration
- React hooks rules
- Consistent code formatting
- TypeScript support

## 🚀 **Deployment**

### **Build Process**

1. Run `npm run build`
2. Deploy the `dist` folder to your hosting service
3. Configure environment variables
4. Set up API endpoints

### **Production Considerations**

- Enable gzip compression
- Set up CDN for static assets
- Configure caching headers
- Monitor performance

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is private and proprietary.

## 🆘 **Support**

For support and questions, please contact the development team.

---

**Built with ❤️ using React, Vite, and Tailwind CSS**
