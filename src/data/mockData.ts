import { ShopData, UserProfile } from '../types/menu';

export const DEMO_SHOP_ID = 'moc-bep-cafe';

export const DEMO_USER: UserProfile = {
  id: 'user-demo-01',
  displayName: 'Nguyễn Văn Minh (Chủ quán Mộc)',
  email: 'minh.moc@qrmenu-demo.vn',
  shopId: DEMO_SHOP_ID,
};

// SVG-based embedded visual assets for sample menu so they never fail to load or depend on external CDNs
const SVG_COVER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
  <defs>
    <linearGradient id="posterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF5A36" />
      <stop offset="70%" stop-color="#7447E8" />
    </linearGradient>
  </defs>
  <rect width="800" height="450" fill="url(#posterGrad)" />
  <!-- Vibrant geometric food poster shapes: Lemon, Pink & White curves -->
  <rect x="40" y="-30" width="280" height="280" rx="70" fill="#E5F76A" opacity="0.85" transform="rotate(12 180 90)" />
  <circle cx="700" cy="110" r="160" fill="#FF83B5" opacity="0.65" />
  <circle cx="670" cy="390" r="200" fill="#E5F76A" opacity="0.75" />
  <rect x="20" y="300" width="260" height="150" rx="50" fill="#241E35" opacity="0.25" />
  <path d="M360 80 Q420 40 480 80 T600 80" stroke="#FFF9F3" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.7" />
  <path d="M390 110 Q450 70 510 110 T630 110" stroke="#E5F76A" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.8" />
  <circle cx="400" cy="240" r="70" fill="#FFF9F3" opacity="0.3" />
</svg>
`);

const SVG_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" rx="52" fill="#FF5A36" />
  <rect x="18" y="18" width="164" height="164" rx="42" fill="none" stroke="#E5F76A" stroke-width="5" stroke-opacity="0.9" />
  <path d="M100 46 C78 72 72 94 72 116 C72 134 85 146 100 146 C115 146 128 134 128 116 C128 94 122 72 100 46 Z" fill="#E5F76A" />
  <path d="M100 60 L100 138" stroke="#FF5A36" stroke-width="4" stroke-linecap="round" />
  <circle cx="100" cy="162" r="5" fill="#E5F76A" />
</svg>
`);

// High-fidelity graphic SVG illustrations for signature dishes
const SVG_COM_GA = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#FFF9F2"/>
  <!-- Dish Plate -->
  <ellipse cx="200" cy="165" rx="140" ry="90" fill="#EDE4D8" stroke="#DBCFBE" stroke-width="3"/>
  <ellipse cx="200" cy="160" rx="125" ry="78" fill="#FFFFFF"/>
  <!-- Turmeric Rice Mound -->
  <ellipse cx="160" cy="165" rx="55" ry="42" fill="#EAB308"/>
  <ellipse cx="155" cy="160" rx="48" ry="36" fill="#FACC15"/>
  <!-- Shredded Chicken -->
  <path d="M205 135 Q235 125 255 145 Q265 165 240 180 Q215 175 205 155 Z" fill="#D97706"/>
  <path d="M215 145 Q240 138 250 155 Q235 170 215 160 Z" fill="#FDE047" opacity="0.7"/>
  <!-- Herbs & Greens -->
  <circle cx="150" cy="135" r="10" fill="#16A34A"/>
  <circle cx="165" cy="130" r="8" fill="#15803D"/>
  <circle cx="215" cy="175" r="12" fill="#22C55E"/>
  <path d="M245 140 Q255 130 260 142" stroke="#15803D" stroke-width="4" stroke-linecap="round"/>
  <!-- Pickled chili and shallots -->
  <ellipse cx="200" cy="180" rx="8" ry="4" fill="#B94F2E"/>
  <ellipse cx="210" cy="184" rx="7" ry="3" fill="#EA580C"/>
</svg>
`);

const SVG_COM_TAM = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#FFF9F2"/>
  <!-- Dish Plate -->
  <ellipse cx="200" cy="165" rx="140" ry="90" fill="#EDE4D8" stroke="#DBCFBE" stroke-width="3"/>
  <ellipse cx="200" cy="160" rx="125" ry="78" fill="#FFFFFF"/>
  <!-- White Broken Rice Mound -->
  <ellipse cx="150" cy="165" rx="50" ry="38" fill="#F5F5F4"/>
  <ellipse cx="148" cy="162" rx="44" ry="32" fill="#FFFFFF"/>
  <circle cx="148" cy="155" r="5" fill="#16A34A"/>
  <!-- Grilled Honey Pork Chop (Sườn nướng) -->
  <path d="M195 130 Q245 120 260 150 Q265 175 230 185 Q195 180 188 150 Z" fill="#8E3A1D"/>
  <path d="M205 138 Q240 130 250 155 Q245 170 215 172 Z" fill="#B94F2E" opacity="0.8"/>
  <line x1="205" y1="140" x2="245" y2="165" stroke="#451A03" stroke-width="3" stroke-linecap="round"/>
  <line x1="215" y1="135" x2="255" y2="155" stroke="#451A03" stroke-width="3" stroke-linecap="round"/>
  <!-- Steamed Egg Meatloaf (Chả trứng) -->
  <path d="M175 185 L205 185 L200 200 L170 200 Z" fill="#F59E0B"/>
  <ellipse cx="187" cy="187" rx="14" ry="4" fill="#FDE68A"/>
</svg>
`);

const SVG_TRA_DAO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#FFF9F2"/>
  <!-- Table shadow -->
  <ellipse cx="200" cy="245" rx="60" ry="12" fill="#29231E" opacity="0.08"/>
  <!-- Glass body -->
  <path d="M165 90 L175 235 Q175 245 200 245 Q225 245 225 235 L235 90 Z" fill="#FB923C" opacity="0.85"/>
  <path d="M167 95 L176 230 Q177 240 200 240 Q223 240 224 230 L233 95 Z" fill="#EA580C" opacity="0.95"/>
  <!-- Peach slices -->
  <path d="M180 130 Q195 110 215 125 Q205 150 180 130 Z" fill="#FDE047"/>
  <path d="M185 165 Q205 145 220 160 Q210 185 185 165 Z" fill="#FDE047"/>
  <!-- Ice cubes -->
  <rect x="185" y="110" width="22" height="22" rx="4" fill="#FFFFFF" opacity="0.6"/>
  <rect x="195" y="145" width="24" height="24" rx="4" fill="#FFFFFF" opacity="0.6"/>
  <!-- Mint leaf & Lemongrass stalk -->
  <path d="M175 80 Q190 60 210 75 Q195 90 175 80 Z" fill="#16A34A"/>
  <line x1="225" y1="60" x2="190" y2="190" stroke="#CA8A04" stroke-width="6" stroke-linecap="round"/>
</svg>
`);

const SVG_CA_PHE_SUA = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#FFF9F2"/>
  <!-- Shadow -->
  <ellipse cx="200" cy="245" rx="50" ry="10" fill="#29231E" opacity="0.08"/>
  <!-- Glass -->
  <path d="M170 85 L178 235 Q180 242 200 242 Q220 242 222 235 L230 85 Z" fill="#5C3A21" opacity="0.9"/>
  <!-- Condensed milk layer bottom -->
  <path d="M176 205 L178 235 Q180 242 200 242 Q220 242 222 235 L224 205 Z" fill="#FEF3C7"/>
  <!-- Coffee layer top -->
  <path d="M171 90 L175 195 L225 195 L229 90 Z" fill="#29231E"/>
  <!-- Ice cubes -->
  <rect x="180" y="105" width="24" height="22" rx="4" fill="#FFFFFF" opacity="0.45"/>
  <rect x="190" y="140" width="22" height="20" rx="4" fill="#FFFFFF" opacity="0.45"/>
  <!-- Straw -->
  <line x1="185" y1="50" x2="195" y2="230" stroke="#B94F2E" stroke-width="4" stroke-linecap="round"/>
</svg>
`);

export const INITIAL_DEMO_DATA: ShopData = {
  shop: {
    id: DEMO_SHOP_ID,
    name: 'Bếp & Cà phê Mộc',
    tagline: 'Hương vị mộc mạc — Đậm đà tình thân',
    description: 'Ẩm thực gia đình Việt Nam kết hợp cà phê rang mộc Tây Nguyên và các loại trà thảo mộc hoa quả tươi mát.',
    address: '48 Hàng Bông, Phường Hàng Gai, Quận Hoàn Kiếm, Hà Nội',
    phone: '0912 345 678',
    logoUrl: SVG_LOGO,
    coverUrl: SVG_COVER,
    themeColor: '#FF5A36', // Cam rực default theme
  },
  categories: [
    { id: 'cat-01', name: 'Món ăn', order: 1 },
    { id: 'cat-02', name: 'Món ăn thêm', order: 2 },
    { id: 'cat-03', name: 'Cà phê', order: 3 },
    { id: 'cat-04', name: 'Trà & nước', order: 4 },
  ],
  items: [
    // --- 1. Món ăn ---
    {
      id: 'item-01',
      name: 'Cơm gà xé Hội An',
      categoryId: 'cat-01',
      pricingMode: 'multiple',
      price: 45000,
      options: [
        { id: 'opt-01', name: 'Cơm đĩa thường', price: 45000 },
        { id: 'opt-02', name: 'Cơm đùi gà góc tư', price: 60000 },
        { id: 'opt-03', name: 'Đặc biệt (Đùi + Lòng gà)', price: 75000 },
      ],
      description: 'Cơm vàng hạt dẻo nấu từ nước dùng gà và nghệ tươi, gà ta thả vườn xé phay trộn rau răm, hành tây, muối tiêu chanh.',
      imageUrl: SVG_COM_GA,
      status: 'available',
      order: 1,
    },
    {
      id: 'item-02',
      name: 'Mì Quảng tôm thịt truyền thống',
      categoryId: 'cat-01',
      pricingMode: 'multiple',
      price: 40000,
      options: [
        { id: 'opt-04', name: 'Tô tiêu chuẩn', price: 40000 },
        { id: 'opt-05', name: 'Tô lớn nhiều tôm thịt', price: 50000 },
      ],
      description: 'Sợi mì gạo cán thủ công, tôm rim đậm vị, thịt ba chỉ thơm nức, ăn kèm bánh tráng mè nướng giòn và rau sống tươi xanh.',
      imageUrl: undefined, // Món không có ảnh - kiểm tra hiển thị đẹp không ô trống
      status: 'available',
      order: 2,
    },
    {
      id: 'item-03',
      name: 'Cơm tấm sườn nướng mật ong',
      categoryId: 'cat-01',
      pricingMode: 'single',
      price: 55000,
      options: [],
      description: 'Sườn cốt lết dày mềm ướp sốt mật ong rừng nướng than hoa, kèm chả trứng hấp béo ngậy và nước mắm ớt chua ngọt chuẩn vị Sài Gòn.',
      imageUrl: SVG_COM_TAM,
      status: 'available',
      order: 3,
    },
    {
      id: 'item-04',
      name: 'Chả giò tôm thịt giòn rụm',
      categoryId: 'cat-01',
      pricingMode: 'single',
      price: 48000,
      options: [],
      description: 'Nhân tôm đất tươi, mộc nhĩ, thịt băm gói bánh tráng rế chiên vàng giòn rụm chấm sốt xí muội.',
      imageUrl: undefined,
      status: 'out_of_stock', // Tạm hết: khách vẫn thấy kèm nhãn rõ ràng
      order: 4,
    },
    {
      id: 'item-05',
      name: 'Lẩu riêu cua đồng bắp bò (Thử nghiệm mùa đông)',
      categoryId: 'cat-01',
      pricingMode: 'single',
      price: 185000,
      options: [],
      description: 'Riêu cua tươi tự giã, sườn sụn non và bắp bò ta hoa tươi giòn ngọt.',
      imageUrl: undefined,
      status: 'hidden', // Ẩn: không xuất hiện trên menu khách
      order: 5,
    },

    // --- 2. Món ăn thêm ---
    {
      id: 'item-06',
      name: 'Trứng ốp la lòng đào',
      categoryId: 'cat-02',
      pricingMode: 'multiple',
      price: 8000,
      options: [
        { id: 'opt-06', name: '1 quả lòng đào', price: 8000 },
        { id: 'opt-07', name: '2 quả lòng đào', price: 15000 },
      ],
      description: 'Trứng gà ta tươi ốp la lòng đào rưới chút nước tương tỏi ớt thơm lừng.',
      imageUrl: undefined,
      status: 'available',
      order: 1,
    },
    {
      id: 'item-07',
      name: 'Chén canh chua cá lóc rau bổi',
      categoryId: 'cat-02',
      pricingMode: 'single',
      price: 25000,
      options: [],
      description: 'Nấu nước cốt me thanh nhẹ, cà chua, dọc mùng, giá đỗ và ngò gai tươi mát.',
      imageUrl: undefined,
      status: 'available',
      order: 2,
    },

    // --- 3. Cà phê ---
    {
      id: 'item-08',
      name: 'Cà phê sữa pha phin rang mộc',
      categoryId: 'cat-03',
      pricingMode: 'multiple',
      price: 28000,
      options: [
        { id: 'opt-08', name: 'Uống nóng', price: 28000 },
        { id: 'opt-09', name: 'Uống đá', price: 30000 },
        { id: 'opt-10', name: 'Chai thủy tinh 250ml mang về', price: 55000 },
      ],
      description: 'Hạt Robusta Cư M’gar rang củi mộc 100%, ủ phin truyền thống phối sữa đặc béo ngậy.',
      imageUrl: SVG_CA_PHE_SUA,
      status: 'available',
      order: 1,
    },
    {
      id: 'item-09',
      name: 'Cà phê đen đá đậm vị',
      categoryId: 'cat-03',
      pricingMode: 'single',
      price: 25000,
      options: [],
      description: 'Gu mộc đậm đà nguyên bản Tây Nguyên, đắng êm dịu, hậu vị ngọt thanh.',
      imageUrl: undefined,
      status: 'available',
      order: 2,
    },
    {
      id: 'item-10',
      name: 'Bạc xỉu ba tầng cốt dừa',
      categoryId: 'cat-03',
      pricingMode: 'single',
      price: 35000,
      options: [],
      description: 'Sự hòa quyện giữa sữa tươi thanh trùng, sữa đặc, chút cà phê phin và bọt cốt dừa béo ngậy.',
      imageUrl: undefined,
      status: 'available',
      order: 3,
    },

    // --- 4. Trà & nước ---
    {
      id: 'item-11',
      name: 'Trà đào cam sả tươi mát',
      categoryId: 'cat-04',
      pricingMode: 'multiple',
      price: 32000,
      options: [
        { id: 'opt-11', name: 'Size Vừa (M)', price: 32000 },
        { id: 'opt-12', name: 'Size Lớn (L)', price: 40000 },
      ],
      description: 'Nền cốt hồng trà ủ lạnh phối đào giòn vàng ươm, cam vàng mọng nước và sả đập dập thơm the mát.',
      imageUrl: SVG_TRA_DAO,
      status: 'available',
      order: 1,
    },
    {
      id: 'item-12',
      name: 'Trà sen vàng củ năng kem sữa',
      categoryId: 'cat-04',
      pricingMode: 'multiple',
      price: 38000,
      options: [
        { id: 'opt-13', name: 'Size Vừa (M)', price: 38000 },
        { id: 'opt-14', name: 'Size Lớn (L)', price: 46000 },
      ],
      description: 'Trà ô long thanh khiết kết hợp hạt sen bùi bở, thạch củ năng giòn sần sật và lớp kem phô mai béo mịn.',
      imageUrl: undefined,
      status: 'available',
      order: 2,
    },
    {
      id: 'item-13',
      name: 'Nước khoáng thiên nhiên LaVie 500ml',
      categoryId: 'cat-04',
      pricingMode: 'single',
      price: 10000,
      options: [],
      description: 'Chai ướp lạnh, phục vụ kèm ly đá sạch.',
      imageUrl: undefined,
      status: 'available',
      order: 3,
    },
  ],
  publishedAt: new Date().toISOString(),
};
