import type { DatabaseSync } from "node:sqlite";
import { DUYVO_VIDEOS } from "./duyvo-videos";

/**
 * Placeholder seed data. Structure mirrors the reference site (category
 * groups, post sections, policy pages); every name and text here is generic
 * sample content — replace it with your own catalogue.
 */

const productCategories: [string, string, string[]][] = [
  ["san-pham-ho-tro", "Sản phẩm hỗ trợ thực dưỡng", ["Canh rau củ dạng bột", "Viên gạo lứt mè đen", "Bột ngũ cốc dinh dưỡng", "Muối mè rang"]],
  ["tra-duong-sinh", "Trà dưỡng sinh", ["Trà gạo lứt rang", "Trà bancha 3 năm", "Trà ngò gai", "Trà thảo mộc an thần"]],
  ["sua-ngu-coc-dau-hat", "Sữa, ngũ cốc, đậu, hạt ăn liền", ["Sữa hạt sen", "Ngũ cốc gạo lứt", "Bột đậu đỏ", "Hạt điều rang muối"]],
  ["mo-muoi-lau-nam", "Mơ muối - chanh muối lâu năm", ["Mơ muối 3 năm", "Chanh muối 5 năm", "Tương mơ", "Giấm mơ"]],
  ["tuong-nuoc-tuong", "Nước tương - gia vị thực dưỡng", ["Nước tương ủ truyền thống", "Tương miso", "Muối biển tinh", "Dầu mè nguyên chất"]],
  ["bot-san-day-nguyen-chat", "Bột sắn dây nguyên chất", ["Bột sắn dây 500g", "Bột sắn dây 1kg", "Bột củ năng", "Bột huỳnh tinh"]],
  ["dung-cu-nha-bep", "Dụng cụ nhà bếp thực dưỡng", ["Nồi đất nấu cơm", "Chảo gang", "Thớt gỗ nghiến", "Bộ đũa tre"]],
  ["rong-tao", "Rong - tảo", ["Rong biển kombu", "Rong wakame", "Rong nori", "Tảo xoắn"]],
  ["gao-huu-co-dau-hat", "Gạo hữu cơ - đậu hạt thô", ["Gạo lứt đỏ hữu cơ", "Gạo lứt đen", "Đậu azuki", "Mè đen hữu cơ"]],
];

const postSections: [string, string, [string, string][]][] = [
  ["thuc-duong", "Thực dưỡng", [
    ["thuc-duong-can-ban", "Thực dưỡng căn bản"],
    ["nau-an-thuc-duong", "Nấu ăn thực dưỡng"],
    ["goc-nhin-thuc-duong", "Góc nhìn thực dưỡng"],
    ["tu-thuoc-thuc-duong", "Tủ thuốc thực dưỡng"],
  ]],
  ["song-khoe", "Sống khỏe", [
    ["kien-thuc-dinh-duong", "Kiến thức dinh dưỡng"],
    ["the-duc-duong-sinh", "Thể dục dưỡng sinh"],
    ["y-hoc-thuong-thuc", "Y học thường thức"],
  ]],
  ["thu-vien", "Thư viện", [
    ["bai-giang-thuc-duong", "Bài giảng"],
    ["tai-lieu-thuc-duong", "Tài liệu"],
  ]],
];

export const seedPages: [string, string, string, string][] = [
  [
    "",
    "gioi-thieu",
    "Giới thiệu",
    `<p><strong>HỘ KINH DOANH CỬA HÀNG PHÚC THỌ</strong></p>
<p>GPKD số 089185004882 cấp ngày 23/10/2025 tại Phòng Kinh Tế Thành phố Hồ Chí Minh.</p>
<p><strong>CỬA HÀNG THỰC DƯỠNG PHÚC THỌ - CUNG CẤP CÁC SẢN PHẨM THỰC DƯỠNG - THẢO DƯỢC - ĐỒ ĂN - THỨC UỐNG - GIA VỊ SẠCH HỮU CƠ SỐNG KHỎE PHÚC THỌ - TÂM AN</strong></p>
<hr />
<h5>CỬA HÀNG THỰC DƯỠNG HIỆN ĐẠI <strong>PHÚC THỌ</strong></h5>
<h5>VỚI PHƯƠNG CHÂM : <strong>ĂN LÀNH - HƯỞNG PHÚC - SỐNG THỌ</strong></h5>
<p><strong>CHÚNG TÔI CHUYÊN CUNG CẤP CÁC SẢN PHẨM THỰC DƯỠNG - THẢO DƯỢC - THỨC ĂN - THỨC UỐNG - GIA VỊ SẠCH HỮU CƠ CHẤT LƯỢNG UY TÍN - VỚI MONG MUỐN MANG ĐẾN CHO QUÝ KHÁCH HÀNG SỰ AN TÂM KHI ĐƯỢC DÙNG CÁC SẢN PHẨM ĐẢM BẢO SỨC KHỎE, CHỮA LÀNH TỰ NHIÊN !</strong></p>
<p><strong>CHÚNG TÔI LUÔN TRI ÂN SỰ TIN TƯỞNG ỦNG HỘ CỦA QUÝ KHÁCH DÀNH CHO CHÚNG TÔI !</strong></p>
<h3>Các nhóm sản phẩm chính</h3>
<ul>
  <li><strong>Gạo Sạch Hữu Cơ:</strong> Gạo lứt ST25, gạo lứt tím than, gạo lứt nâu...</li>
  <li><strong>Ngũ Cốc - Đậu Hạt Sạch Hữu Cơ:</strong> Bột ngũ cốc TAMI, bột sắn dây, đậu Hà Lan hữu cơ, đậu lăng đỏ hữu cơ...</li>
  <li><strong>Bún Phở Mì Hủ Tíu Khô:</strong> Bún, phở, mì, hủ tiếu chế biến từ gạo lứt và ngũ cốc tự nhiên.</li>
  <li><strong>Thực Phẩm Dinh Dưỡng Ăn Liền:</strong> Cháo gạo lứt rong biển, canh rong biển, súp, bún ăn liền...</li>
  <li><strong>Gia Vị Tự Nhiên:</strong> Bột nêm ngưu báng, nước tương Tamari, tương Miso, muối biển, dầu mè...</li>
  <li><strong>Thức Uống Dưỡng Sinh:</strong> Chiết xuất rau củ hỗn hợp (canh dưỡng sinh hòa tan), trà dưỡng sinh, thảo dược...</li>
</ul>
<h3>Thông tin liên hệ</h3>
<ul>
  <li><strong>Đơn vị chủ quản:</strong> HỘ KINH DOANH CỬA HÀNG PHÚC THỌ</li>
  <li><strong>Giấy phép kinh doanh:</strong> GPKD số 089185004882 cấp ngày 23/10/2025 tại Phòng Kinh Tế Thành phố Hồ Chí Minh</li>
  <li><strong>Địa chỉ:</strong> Ấp 1, Xã Bình Hưng, TP Hồ Chí Minh</li>
  <li><strong>Hotline / Hỗ trợ mua hàng:</strong> <a href="tel:0767518592">0767.518.592</a> - <a href="tel:0858816070">0858.816.070</a></li>
  <li><strong>Email:</strong> <a href="mailto:thucduonghiendaiphuctho@gmail.com">thucduonghiendaiphuctho@gmail.com</a></li>
  <li><strong>Facebook:</strong> <a href="https://www.facebook.com/thucduongphuctho" target="_blank" rel="noopener noreferrer">facebook.com/thucduongphuctho</a></li>
  <li><strong>Youtube:</strong> <a href="https://www.youtube.com/@SongKhoePhucTho" target="_blank" rel="noopener noreferrer">youtube.com/@SongKhoePhucTho</a></li>
</ul>`,
  ],
  [
    "",
    "lien-he",
    "Liên hệ",
    `<p>Quý khách hàng cần tư vấn miễn phí về sản phẩm thực dưỡng hoặc hỗ trợ đặt hàng xin vui lòng liên hệ với <strong>Cửa hàng Thực Dưỡng Phúc Thọ</strong>:</p>
<h3>Thông tin liên hệ</h3>
<ul>
  <li>
    <p>Địa chỉ chúng tôi</p>
    <p><strong>Ấp 1, Xã Bình Hưng, TP Hồ Chí Minh</strong></p>
  </li>
  <li>
    <p>Điện thoại / Zalo hỗ trợ</p>
    <p><strong><a href="tel:0767518592">0767.518.592</a> - <a href="tel:0858816070">0858.816.070</a></strong></p>
  </li>
  <li>
    <p>Email chúng tôi</p>
    <p><strong><a href="mailto:thucduonghiendaiphuctho@gmail.com">thucduonghiendaiphuctho@gmail.com</a></strong></p>
  </li>
  <li>
    <p>Thời gian làm việc</p>
    <p><strong>Thứ 2 đến Thứ 6 từ 8h đến 18h; Thứ 7 và Chủ nhật từ 9h00 đến 17h00</strong></p>
  </li>
</ul>
<h3>Kênh truyền thông chính thức</h3>
<ul>
  <li><strong>Website:</strong> <a href="https://www.thucduongphuctho.net" target="_blank" rel="noopener noreferrer">thucduongphuctho.net</a></li>
  <li><strong>Facebook:</strong> <a href="https://www.facebook.com/thucduongphuctho" target="_blank" rel="noopener noreferrer">facebook.com/thucduongphuctho</a></li>
  <li><strong>Youtube:</strong> <a href="https://www.youtube.com/@SongKhoePhucTho" target="_blank" rel="noopener noreferrer">youtube.com/@SongKhoePhucTho</a></li>
</ul>
<h3>Thông tin chuyển khoản ngân hàng</h3>
<ul>
  <li><strong>STK:</strong> 8610312888</li>
  <li><strong>Ngân hàng:</strong> BIDV</li>
  <li><strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</li>
  <li><strong>Nội dung chuyển khoản:</strong> Mã đơn hàng - tên khách hàng</li>
</ul>`,
  ],
  [
    "chinh-sach",
    "chinh-sach-thanh-toan",
    "Chính sách thanh toán",
    `<h3>1. Thanh toán tiền mặt</h3>
<p><strong>Thanh toán tiền mặt tại nhà khi nhận hàng thông qua hình thức giao hàng trực tiếp:</strong></p>
<p>Khi nhân viên giao hàng, khách hàng kiểm tra sản phẩm, nhận hàng và thanh toán trực tiếp cho nhân viên giao hàng theo giá trị tiền trên hóa đơn và phí vận chuyển (nếu có).</p>
<h3>2. Thanh toán chuyển khoản ngân hàng</h3>
<ul>
  <li><strong>STK:</strong> 8610312888</li>
  <li><strong>Ngân hàng:</strong> BIDV</li>
  <li><strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</li>
  <li><strong>Nội dung chuyển khoản:</strong> Mã đơn hàng - tên khách hàng</li>
</ul>
<h3>3. Liên hệ hỗ trợ đặt hàng</h3>
<p>Liên hệ mua hàng: <strong>0767.518.592 - 0858.816.070</strong> (Tư vấn miễn phí - nhiệt tình).</p>`,
  ],
  [
    "chinh-sach",
    "huong-dan-mua-hang",
    "Hướng dẫn mua hàng",
    `<h3>1. Thanh toán tiền mặt</h3>
<p><strong>Thanh toán tiền mặt tại nhà khi nhận hàng thông qua hình thức giao hàng trực tiếp:</strong></p>
<p>Khi nhân viên giao hàng, khách hàng kiểm tra sản phẩm, nhận hàng và thanh toán trực tiếp cho nhân viên giao hàng theo giá trị tiền trên hóa đơn và phí vận chuyển (nếu có).</p>
<h3>2. Thanh toán chuyển khoản ngân hàng</h3>
<ul>
  <li><strong>STK:</strong> 8610312888</li>
  <li><strong>Ngân hàng:</strong> BIDV</li>
  <li><strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</li>
  <li><strong>Nội dung chuyển khoản:</strong> Mã đơn hàng - tên khách hàng</li>
</ul>
<h3>3. Liên hệ hỗ trợ đặt hàng</h3>
<p>Liên hệ mua hàng: <strong>0767.518.592 - 0858.816.070</strong> (Tư vấn miễn phí - nhiệt tình).</p>`,
  ],
  [
    "chinh-sach",
    "chinh-sach-bao-mat-thong-tin",
    "Chính sách bảo mật thông tin",
    `<p><strong>1. Mục đích và phạm vi thu thập.</strong></p>
<ul>
  <li>Việc thu thập dữ liệu trên website bao gồm: họ tên, email, điện thoại, địa chỉ khách hàng. Đây là các thông tin mà chúng tôi cần khách hàng cung cấp bắt buộc khi gửi thông tin nhờ tư vấn hay muốn mua sản phẩm và để chúng tôi liên hệ xác nhận lại với khách hàng trên website nhằm đảm bảo quyền lợi cho người tiêu dùng.</li>
  <li>Các khách hàng sẽ tự chịu trách nhiệm về bảo mật và lưu giữ mọi hoạt động sử dụng dịch vụ dưới thông tin mà mình cung cấp và hộp thư điện tử của mình.</li>
</ul>
<p><strong>2. Phạm vi sử dụng thông tin.</strong> Chúng tôi sử dụng thông tin khách hàng cung cấp để:</p>
<ul>
  <li>Liên hệ xác nhận đơn hàng và giao hàng cho khách hàng khi nhận được yêu cầu từ khách hàng;</li>
  <li>Cung cấp thông tin về sản phẩm đến khách hàng nếu có yêu cầu từ khách hàng;</li>
  <li>Gửi email tiếp thị, khuyến mại về hàng hóa do chúng tôi bán;</li>
  <li>Gửi các thông báo về các hoạt động trên website;</li>
  <li>Liên lạc và giải quyết với người dùng trong những trường hợp đặc biệt;</li>
  <li>Không sử dụng thông tin cá nhân của người dùng ngoài mục đích xác nhận và liên hệ có liên quan đến giao dịch;</li>
  <li>Khi có yêu cầu của cơ quan tư pháp bao gồm: Viện kiểm sát, tòa án, cơ quan công an điều tra liên quan đến hành vi vi phạm pháp luật nào đó của khách hàng.</li>
</ul>
<p><strong>3. Thời gian lưu trữ thông tin.</strong></p>
<p>Dữ liệu cá nhân của khách hàng sẽ được lưu trữ cho đến khi có yêu cầu ban quản trị hủy bỏ. Còn lại trong mọi trường hợp thông tin cá nhân khách hàng sẽ được bảo mật trên máy chủ của chúng tôi.</p>
<p><strong>4. Những người hoặc tổ chức có thể tiếp cận thông tin cá nhân.</strong></p>
<ul>
  <li>Ban quản trị website.</li>
  <li>Khách hàng sở hữu thông tin cá nhân đó.</li>
  <li>Các cơ quan Pháp luật Việt Nam có thẩm quyền.</li>
  <li>Các đối tác hoạt động liên quan đến giao dịch của bạn, chẳng hạn như đơn vị vận chuyển.</li>
</ul>
<p><strong>5. Địa chỉ của đơn vị thu thập và quản lí thông tin cá nhân.</strong></p>
<ul>
  <li><strong>HỘ KINH DOANH CỬA HÀNG PHÚC THỌ</strong></li>
  <li><strong>Địa chỉ:</strong> Ấp 1, Xã Bình Hưng, TP Hồ Chí Minh</li>
</ul>
<p><strong>6. Phương tiện và công cụ để người dùng tiếp cận và chỉnh sửa dữ liệu cá nhân của mình.</strong></p>
<ul>
  <li>Khách hàng có quyền tự kiểm tra, cập nhật, điều chỉnh hoặc hủy bỏ thông tin cá nhân của mình bằng cách liên hệ với ban quản trị website thực hiện việc này.</li>
  <li>Khách hàng có quyền gửi khiếu nại về nội dung bảo mật thông tin đề nghị liên hệ ban quản trị của website. Khi tiếp nhận những phản hồi này, chúng tôi sẽ xác nhận lại thông tin, trường hợp đúng như phản ánh của khách hàng tùy theo mức độ, chúng tôi sẽ có những biện pháp xử lý kịp thời.</li>
</ul>
<p><strong>7. Cơ chế tiếp nhận và giải quyết khiếu nại của người tiêu dùng.</strong></p>
<ul>
  <li>Khi phát hiện thông tin cá nhân của mình bị sử dụng sai mục đích hoặc phạm vi, khách hàng gọi điện thoại tới số <a href="tel:0767518592">0767.518.592</a> - <a href="tel:0858816070">0858.816.070</a> hoặc email <a href="mailto:thucduonghiendaiphuctho@gmail.com">thucduonghiendaiphuctho@gmail.com</a> để khiếu nại và cung cấp chứng cứ liên quan đến vụ việc cho ban quản trị.</li>
  <li>Ban quản trị cam kết sẽ phản hồi ngay lập tức hoặc muộn nhất là trong vòng 24 giờ làm việc kể từ thời điểm nhận được khiếu nại.</li>
</ul>`,
  ],
  [
    "chinh-sach",
    "chinh-sach-doi-tra-hoan-tien",
    "Chính sách đổi trả - hoàn tiền",
    `<p><strong>1. Điều kiện đổi trả</strong></p>
<p>Quý Khách hàng cần kiểm tra tình trạng hàng hóa và có thể đổi hàng/ trả lại hàng ngay tại thời điểm giao/nhận hàng trong những trường hợp sau:</p>
<ul>
  <li>Hàng không đúng chủng loại, mẫu mã trong đơn hàng đã đặt hoặc như trên website tại thời điểm đặt hàng.</li>
  <li>Không đủ số lượng, không đủ bộ như trong đơn hàng.</li>
  <li>Tình trạng bên ngoài bị ảnh hưởng như rách bao bì, bong tróc, bể vỡ…</li>
</ul>
<p>Khách hàng có trách nhiệm trình giấy tờ liên quan chứng minh sự thiếu sót trên để hoàn thành việc hoàn trả/đổi trả hàng hóa.</p>
<p><strong>2. Quy định về thời gian thông báo và gửi sản phẩm đổi trả</strong></p>
<ul>
  <li><strong>Thời gian thông báo đổi trả:</strong> trong vòng 48h kể từ khi nhận sản phẩm đối với trường hợp sản phẩm thiếu phụ kiện, quà tặng hoặc bể vỡ.</li>
  <li><strong>Thời gian gửi chuyển trả sản phẩm:</strong> trong vòng 7 ngày kể từ khi nhận sản phẩm.</li>
  <li><strong>Địa điểm đổi trả sản phẩm:</strong> Khách hàng có thể mang hàng trực tiếp đến văn phòng/ cửa hàng của chúng tôi hoặc chuyển qua đường bưu điện.</li>
</ul>
<p>Trong trường hợp Quý Khách hàng có ý kiến đóng góp/khiếu nại liên quan đến chất lượng sản phẩm, Quý Khách hàng vui lòng liên hệ đường dây chăm sóc khách hàng của chúng tôi.</p>`,
  ],
  [
    "chinh-sach",
    "chinh-sach-van-chuyen",
    "Chính sách vận chuyển",
    `<p><strong>1. Các phương thức giao hàng</strong></p>
<p>Khách hàng đặt mua tại website của cửa hàng chúng tôi hoặc qua kênh Zalo. Ship hàng qua các đơn vị vận chuyển.</p>
<p><strong>2. Thời hạn ước tính cho việc giao hàng</strong></p>
<ul>
  <li><strong>Khu vực trong Thành phố Hồ Chí Minh:</strong> 1 - 2 ngày sau khi đặt hàng</li>
  <li><strong>Các khu vực khác:</strong> 3 - 4 ngày sau khi đặt hàng</li>
</ul>
<p><strong>Tuy nhiên, cũng có trường hợp việc giao hàng kéo dài hơn nhưng chỉ xảy ra trong những tình huống bất khả kháng như sau:</strong></p>
<ul>
  <li>Nhân viên chúng tôi liên lạc với khách hàng qua điện thoại không được nên không thể giao hàng.</li>
  <li>Địa chỉ giao hàng bạn cung cấp không chính xác hoặc khó tìm.</li>
  <li>Số lượng đơn hàng tăng đột biến khiến việc xử lý đơn hàng bị chậm.</li>
  <li>Đối tác cung cấp hàng chậm hơn dự kiến khiến việc giao hàng bị chậm lại hoặc đối tác vận chuyển giao hàng bị chậm.</li>
</ul>
<p><strong>3. Các giới hạn về mặt địa lý cho việc giao hàng</strong></p>
<p>Riêng khách tỉnh có nhu cầu mua số lượng lớn hoặc khách buôn sỉ nếu có nhu cầu mua sản phẩm, chúng tôi sẽ nhờ dịch vụ giao nhận của các công ty vận chuyển và phí sẽ được tính theo phí của các đơn vị cung cấp dịch vụ vận chuyển hoặc theo thoả thuận hợp đồng giữa 2 bên.</p>
<p><strong>4. Phân định trách nhiệm của thương nhân, tổ chức cung ứng dịch vụ logistics về cung cấp chứng từ hàng hóa trong quá trình giao nhận</strong></p>
<p>Bên giao nhận có trách nhiệm cung cấp chứng từ hàng hoá trong quá trình giao nhận. Bên vận chuyển có quyền và trách nhiệm cung cấp hóa đơn cho cơ quan quản lý nhà nước khi có yêu cầu. Đơn vị vận chuyển sẽ chịu trách nhiệm vận chuyển hàng hóa theo nguyên tắc “nguyên đai, nguyên kiện”.</p>
<p>Trên bao bì tất cả các đơn hàng đều có thông tin: Thông tin người nhận (tên người nhận, số điện thoại và địa chỉ người nhận) và Mã vận đơn của đơn hàng. Để đảm bảo an toàn cho hàng hóa, thucduongphuctho.net sẽ gửi kèm hóa đơn.</p>
<p><strong>5. Trách nhiệm về trường hợp hàng bị hư hỏng do quá trình vận chuyển</strong></p>
<p>Đối với hàng hóa bị hư hỏng do quá trình vận chuyển dù là đơn hàng do chính cửa hàng vận chuyển hay do bên thứ 3 vận chuyển thì chúng tôi sẽ là bên đứng ra chịu trách nhiệm giải quyết vấn đề cho khách hàng. Khách hàng có quyền từ chối nhận sản phẩm và yêu cầu đổi trả theo quy định “đổi trả hoàn phí”, còn mọi vấn đề phát sinh chúng tôi sẽ làm việc lại với đối tác vận chuyển để giải quyết đền bù cho đơn hàng theo thỏa thuận hợp tác giữa công ty với đối tác thứ 3 cung cấp dịch vụ vận chuyển.</p>
<p><strong>Lưu ý:</strong> Trường hợp phát sinh chậm trễ trong việc giao hàng chúng tôi sẽ thông tin kịp thời cho khách hàng và khách hàng có thể lựa chọn giữa việc hủy hoặc tiếp tục chờ hàng.</p>`,
  ],
  [
    "chinh-sach",
    "chinh-sach-kiem-hang",
    "Chính sách kiểm hàng",
    `<p><strong>1. Định nghĩa</strong></p>
<p>Kiểm hàng là thực hiện các công việc kiểm tra và so sánh các sản phẩm/hàng hóa nhận được trong kiện hàng thucduongphuctho.net gửi với các sản phẩm trong đơn hàng mà quý khách hàng yêu cầu.</p>
<p><strong>2. Thời điểm kiểm hàng</strong></p>
<ul>
  <li>thucduongphuctho.net chấp nhận cho khách hàng đồng kiểm với nhân viên giao hàng tại thời điểm nhận hàng (hoặc trong vòng 30p kể từ khi khách nhận được hàng hóa).</li>
  <li>Sau khi nhận hàng, khách hàng kiểm lại phát hiện sai, có thể liên lạc với bộ phận chăm sóc khách hàng để được hỗ trợ đổi trả.</li>
</ul>
<p><strong>Lưu ý: Quý khách quay video lúc mở thùng hàng để đối chiếu khi cần thiết.</strong></p>
<p><strong>3. Phạm vi kiểm tra hàng hóa</strong></p>
<p>Khách hàng được kiểm đếm số lượng sản phẩm thực nhận, đối chiếu, so sánh các sản phẩm nhận được với sản phẩm đã đặt trên đơn sau khi nhân viên xác nhận đơn hàng theo các tiêu chí:</p>
<ul>
  <li>Theo các thuộc tính cơ bản hàng hóa: tên hàng, số lượng, thông tin của khách hàng trên các giấy tờ của đơn hàng.</li>
  <li>Theo mẫu mã được hiển thị bởi ảnh đại diện của sản phẩm được lưu khi đặt hàng và sau khi được nhân viên xác nhận đơn hàng.</li>
  <li>Tuyệt đối không bóc, mở các hộp sản phẩm có tem niêm phong, tem đảm bảo.</li>
  <li>Không được cào lấy mã các sản phẩm có tích điểm, đổi quà.</li>
</ul>
<p>Quý khách hàng vui lòng không bóc và sử dụng các sản phẩm trong kiện hàng khi đang còn vấn đề trong quá trình kiểm tra hàng hóa với chúng tôi.</p>
<p><strong>4. Các bước xử lý khi hàng hóa nhận được không như đơn đặt hàng</strong></p>
<ul>
  <li>Khi quý khách đồng kiểm, sản phẩm nhận được không như sản phẩm khách đặt trên đơn hàng. Xin hãy liên hệ với <strong>hotline</strong> để được gặp bộ phận chăm sóc khách hàng xác nhận lại đơn hàng.</li>
  <li>Trường hợp đóng sai đơn hàng theo yêu cầu của khách, khách có thể không nhận hàng, không thanh toán. Trong trường hợp đơn hàng đã thanh toán, khách hàng có thể yêu cầu gửi lại đơn mới hay không, thucduongphuctho.net sẽ hoàn lại tiền cho quý khách trong thời gian sớm nhất.</li>
</ul>
<p><strong>5. Các kênh thông tin tiếp nhận khiếu nại của khách hàng</strong></p>
<p><strong>Mọi thông tin khiếu nại của khách hàng, chúng tôi tiếp nhận qua số hotline <a href="tel:0767518592">0767.518.592</a> - <a href="tel:0858816070">0858.816.070</a> hoặc email <a href="mailto:thucduonghiendaiphuctho@gmail.com">thucduonghiendaiphuctho@gmail.com</a></strong></p>`,
  ],
];

// Sample only — import the full province/ward dataset for production.
const provinces: [string, string, [string, string][]][] = [
  ["01", "Thành phố Hà Nội", [["00001", "Phường Ba Đình"], ["00002", "Phường Hoàn Kiếm"], ["00003", "Phường Đống Đa"]]],
  ["79", "Thành phố Hồ Chí Minh", [["26734", "Phường Sài Gòn"], ["26735", "Phường Bến Thành"], ["26736", "Phường Tân Định"]]],
  ["48", "Thành phố Đà Nẵng", [["20194", "Phường Hải Châu"], ["20195", "Phường Thanh Khê"]]],
];

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const lorem =
  "<p>Đây là nội dung mẫu. Thay bằng mô tả thật của bạn: nguồn gốc, thành phần, công dụng, cách dùng và bảo quản.</p>" +
  "<h3>Thành phần</h3><p>Nội dung mẫu.</p><h3>Hướng dẫn sử dụng</h3><p>Nội dung mẫu.</p>";

const SAMPLE_BRANDS = ["Thực Dưỡng Phúc Thọ", "Tâm Minh Foods", "King Kung", "Marumata", "C'Lavie", "G&W Úc", "Lý Phong"];
const SAMPLE_ORIGINS = ["Việt Nam", "Nhật Bản", "Đài Loan", "Úc"];
const SAMPLE_UNITS = ["Gói 500g", "Hộp 30 gói", "Hũ 350g", "Túi 1kg", "Chai 500ml", "Hộp 60 gói"];

export function inferProductSpecs(id: number, name: string) {
  const lower = name.toLowerCase();
  const sku = `PT-${String(id).padStart(3, "0")}`;
  let brand = SAMPLE_BRANDS[id % SAMPLE_BRANDS.length];
  let origin = SAMPLE_ORIGINS[id % SAMPLE_ORIGINS.length];
  let unit = SAMPLE_UNITS[id % SAMPLE_UNITS.length];

  if (lower.includes("canh dưỡng sinh") || lower.includes("king kung")) {
    brand = "King Kung";
    origin = "Đài Loan";
    unit = "Hộp 60 gói";
  } else if (lower.includes("tâm minh") || lower.includes("ngũ cốc") || lower.includes("bún") || lower.includes("phở")) {
    brand = "Tâm Minh Foods";
    origin = "Việt Nam";
    unit = "Gói 500g";
  } else if (lower.includes("tamari") || lower.includes("miso") || lower.includes("tương") || lower.includes("mơ muối") || lower.includes("bancha") || lower.includes("kombu") || lower.includes("wakame") || lower.includes("nori")) {
    brand = "Marumata";
    origin = "Nhật Bản";
    unit = lower.includes("tương") ? "Chai 500ml" : "Gói 250g";
  } else if (lower.includes("gạo") || lower.includes("đậu") || lower.includes("mè") || lower.includes("hạt") || lower.includes("sắn dây")) {
    brand = "Thực Dưỡng Phúc Thọ";
    origin = "Việt Nam";
    unit = lower.includes("1kg") ? "Túi 1kg" : "Gói 500g";
  } else if (lower.includes("hồi sinh miễn dịch") || lower.includes("glucan") || lower.includes("men")) {
    brand = "G&W Úc";
    origin = "Úc";
    unit = "Hộp 60 viên";
  }

  const m = name.match(/((?:hộp|gói|túi|chai|hũ|hủ|lọ|bịch)?\s*\d+(?:[.,]\d+)?\s*(?:gói|gram|gr|kg|ml|lít|viên|túi|miếng|g\b))/i);
  if (m) {
    const extracted = m[1].trim().replace(/\s+/g, " ");
    unit = extracted.charAt(0).toUpperCase() + extracted.slice(1).toLowerCase();
  }

  return { sku, brand, origin, unit };
}

export function extractYoutubeId(raw: string): string | null {
  const s = (raw || "").trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const watchMatch = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = s.match(/youtube\.com\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

/**
 * Real videos & playlists from YouTube channel Duy Vo (https://www.youtube.com/@quocduy2401)
 * Format: [video_id, title, topic (playlist), description]
 */
export const seedVideos: [string, string, string, string][] = DUYVO_VIDEOS;

export function seed(db: DatabaseSync) {
  db.exec("BEGIN");
  try {
    const insCat = db.prepare("INSERT INTO product_categories (slug, name, sort) VALUES (?, ?, ?)");
    const insProd = db.prepare(
      "INSERT INTO products (slug, category_id, name, price, sale_price, summary, description, featured, sku, brand, origin, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    let prodIdx = 0;
    productCategories.forEach(([slug, name, items], i) => {
      const catId = Number(insCat.run(slug, name, i).lastInsertRowid);
      items.forEach((p, j) => {
        prodIdx++;
        const price = 50000 + ((i * 7 + j * 13) % 20) * 15000;
        const sale = j % 2 === 0 ? price - 20000 : null;
        const specs = inferProductSpecs(prodIdx, p);
        insProd.run(
          slugify(p),
          catId,
          p,
          price,
          sale,
          `Mô tả ngắn cho ${p.toLowerCase()} — sản phẩm thực dưỡng chọn lọc, an lành cho sức khỏe.`,
          lorem,
          j === 0 ? 1 : 0,
          specs.sku,
          specs.brand,
          specs.origin,
          specs.unit,
        );
      });
    });

    const insSec = db.prepare("INSERT INTO post_sections (slug, name, sort) VALUES (?, ?, ?)");
    const insPCat = db.prepare("INSERT INTO post_categories (slug, section_slug, name) VALUES (?, ?, ?)");
    const insPost = db.prepare(
      "INSERT INTO posts (slug, category_id, title, excerpt, content, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))",
    );
    let n = 0;
    postSections.forEach(([sec, secName, cats], i) => {
      insSec.run(sec, secName, i);
      for (const [cslug, cname] of cats) {
        const cid = Number(insPCat.run(cslug, sec, cname).lastInsertRowid);
        for (let k = 1; k <= 3; k++) {
          n++;
          const title = `${cname}: bài viết mẫu số ${k}`;
          insPost.run(slugify(title), cid, title, "Tóm tắt bài viết mẫu — thay bằng nội dung của bạn.", lorem, `-${n} days`);
        }
      }
    });

    const insPage = db.prepare("INSERT INTO pages (grp, slug, title, content) VALUES (?, ?, ?, ?)");
    for (const [grp, slug, title, content] of seedPages) {
      insPage.run(grp, slug, title, content);
    }

    const insProv = db.prepare("INSERT INTO provinces (code, name) VALUES (?, ?)");
    const insWard = db.prepare("INSERT INTO wards (code, province_code, name) VALUES (?, ?, ?)");
    for (const [code, name, wards] of provinces) {
      insProv.run(code, name);
      for (const [wcode, wname] of wards) insWard.run(wcode, code, wname);
    }

    const insVid = db.prepare(
      "INSERT INTO videos (youtube_url, video_id, title, topic, description, sort) VALUES (?, ?, ?, ?, ?, ?)",
    );
    seedVideos.forEach(([vid, title, topic, desc], idx) => {
      insVid.run(`https://www.youtube.com/watch?v=${vid}`, vid, title, topic, desc, idx + 1);
    });
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
