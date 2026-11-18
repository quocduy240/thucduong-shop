export type SeedDocument = {
  slug: string;
  title: string;
  folder_path: string;
  doc_type: "pdf" | "doc" | "ppt" | "book";
  access_mode: "free" | "survey" | "bundle" | "paid" | "affiliate";
  price: number;
  drive_url: string;
  drive_folder_url: string;
  affiliate_url: string;
  bundle_product_id: number | null;
  cover: string;
  author: string;
  pages: number;
  file_size: string;
  summary: string;
  highlights: string;
  review_html: string;
  task_prompt: string;
  downloads: number;
  sort: number;
};

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    slug: "cam-nang-thuc-duong-hien-dai-cho-nguoi-moi",
    title: "Cẩm Nang Thực Dưỡng Hiện Đại Cho Người Mới Bắt Đầu",
    folder_path: "01. Thực Dưỡng Căn Bản / Nền Tảng Âm Dương",
    doc_type: "pdf",
    access_mode: "free",
    price: 0,
    drive_url: "https://drive.google.com/file/d/1thucduong-cam-nang-co-ban/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1thucduong-can-ban",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Duy Vo & Thực Dưỡng Phúc Thọ",
    pages: 68,
    file_size: "4.5 MB",
    summary:
      "Tài liệu nền tảng giúp người mới hiểu đúng về Thực Dưỡng Hiện Đại, nguyên lý quân bình Âm Dương và cách chuyển đổi bữa ăn gia đình an toàn, khoa học.",
    highlights: [
      "Hiểu đúng bản chất Thực Dưỡng Hiện Đại — không cực đoan, không ép xác",
      "Cách phân biệt thực phẩm Âm - Dương và nguyên tắc phối hợp trong bữa ăn",
      "Hướng dẫn nấu cơm gạo lứt mềm ngon cho người lớn tuổi và trẻ nhỏ",
      "Tháp dinh dưỡng thực dưỡng toàn phần (WFPB) ứng dụng hàng ngày",
      "10 sai lầm phổ biến của người mới ăn thực dưỡng và cách khắc phục",
    ].join("\n"),
    review_html: `<h3>1. Tổng quan tài liệu</h3>
<p><strong>Cẩm Nang Thực Dưỡng Hiện Đại Cho Người Mới Bắt Đầu</strong> là tài liệu nhập môn được biên soạn ngắn gọn, súc tích dựa trên chuỗi bài giảng thực tế trên kênh YouTube <strong>Duy Vo (@quocduy2401)</strong> và kinh nghiệm tư vấn tại <strong>Cửa hàng Thực Dưỡng Phúc Thọ</strong>.</p>
<h3>2. Nội dung cốt lõi trong tài liệu</h3>
<ul>
  <li><strong>Chương 1:</strong> Thực dưỡng hiện đại là gì? Tại sao thực phẩm toàn phần là chìa khóa sức khỏe?</li>
  <li><strong>Chương 2:</strong> Nguyên lý Âm Dương trong chọn lựa và chế biến thức ăn hàng ngày.</li>
  <li><strong>Chương 3:</strong> Nhóm thực phẩm nền tảng: Gạo lứt, đậu hạt hữu cơ, tương Tamari, Miso, mơ muối lâu năm.</li>
  <li><strong>Chương 4:</strong> Thực đơn mẫu 14 ngày dễ áp dụng cho cả gia đình.</li>
</ul>
<h3>3. Ai nên đọc tài liệu này?</h3>
<p>Phù hợp cho mọi cô chú, anh chị mới tìm hiểu thực dưỡng, muốn cải thiện sức khỏe tự nhiên mà chưa biết bắt đầu từ đâu.</p>`,
    task_prompt: "",
    downloads: 428,
    sort: 1,
  },
  {
    slug: "bang-phan-loai-thuc-pham-am-duong",
    title: "Bảng Phân Loại Thực Phẩm Âm Dương & Cách Quân Bình Bữa Ăn",
    folder_path: "01. Thực Dưỡng Căn Bản / Nền Tảng Âm Dương",
    doc_type: "doc",
    access_mode: "free",
    price: 0,
    drive_url: "https://docs.google.com/document/d/1bang-phan-loai-am-duong/edit?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1thucduong-can-ban",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Thực Dưỡng Phúc Thọ",
    pages: 24,
    file_size: "1.8 MB",
    summary:
      "Bảng tra cứu nhanh tính Âm - Dương của hơn 200 loại ngũ cốc, rau củ, đậu hạt, gia vị và thức uống thông dụng tại Việt Nam, có thể in dán tại gian bếp.",
    highlights: [
      "Phân loại chi tiết hơn 200 thực phẩm theo thang độ từ Cực Âm đến Cực Dương",
      "Cách khử tính hàn (Âm) của rau củ bằng muối biển, dầu mè, gừng và lửa nấu",
      "Bảng tra cứu gia vị chuẩn thực dưỡng: Tamari, Miso, Muối mè, Mơ muối",
      "Định dạng Word (DOCX) dễ dàng chỉnh sửa và in khổ A4 dán tại nhà bếp",
    ].join("\n"),
    review_html: `<h3>1. Giới thiệu Bảng tra cứu</h3>
<p>Tài liệu định dạng <strong>Microsoft Word / Google Docs</strong> được thiết kế trực quan theo dạng bảng biểu giúp người nội trợ tra cứu nhanh trước khi đi chợ và nấu ăn.</p>
<h3>2. Giá trị thực tiễn</h3>
<ul>
  <li>Biết cách chọn thực phẩm phù hợp với thể trạng (người thể hàn/lạnh bụng nên tránh thực phẩm quá Âm).</li>
  <li>Nắm vững kỹ thuật <strong>Dương hóa thực phẩm</strong> qua cách cắt thái, xào nấu và nêm gia vị tự nhiên.</li>
</ul>`,
    task_prompt: "",
    downloads: 315,
    sort: 2,
  },
  {
    slug: "72-cong-thuc-nau-an-thuc-duong-va-sua-hat",
    title: "72 Công Thức Nấu Ăn Thực Dưỡng & Làm Sữa Hạt Dinh Dưỡng Tại Nhà",
    folder_path: "01. Thực Dưỡng Căn Bản / Nấu Ăn Dưỡng Sinh",
    doc_type: "pdf",
    access_mode: "survey",
    price: 0,
    drive_url: "https://drive.google.com/file/d/1cong-thuc-nau-an-thuc-duong-72/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1thucduong-can-ban",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Duy Vo & Thực Dưỡng Phúc Thọ",
    pages: 95,
    file_size: "8.4 MB",
    summary:
      "Tuyển tập 72 món ăn thực dưỡng thanh đạm, ngon miệng (cơm lứt, cháo nano, súp dưỡng sinh, đậu hạt hầm, sữa hạt) dễ làm tại nhà.",
    highlights: [
      "20 công thức sữa hạt thảo mộc thơm béo tự nhiên không dùng đường tinh luyện",
      "Cách nấu Cháo Nano Gạo Lứt dễ tiêu hóa cho người bệnh và người cao tuổi",
      "30 món kho, xào, súp rau củ hữu cơ kết hợp tương Miso, Tamari đậm đà",
      "Hướng dẫn làm muối mè (Gomasio) đúng tỷ lệ vàng 14:1 đến 18:1",
    ].join("\n"),
    review_html: `<h3>1. Đánh giá tổng quan</h3>
<p>Nhiều người nghĩ ăn thực dưỡng là khô khan chỉ có cơm gạo lứt muối mè. Tài liệu <strong>72 Công Thức Nấu Ăn Thực Dưỡng &amp; Sữa Hạt</strong> giúp bạn biến căn bếp gia đình thành nơi nuôi dưỡng sức khỏe với thực đơn phong phú mỗi ngày.</p>
<h3>2. Bố cục tài liệu</h3>
<ul>
  <li><strong>Phần 1:</strong> Kỹ thuật ngâm và nấu gạo lứt, đậu đỏ Azuki, đậu gà, hạt sen.</li>
  <li><strong>Phần 2:</strong> Các món canh súp dưỡng sinh (súp cá chép ngưu báng, canh rong biển Wakame/Kombu).</li>
  <li><strong>Phần 3:</strong> 20 công thức sữa hạt bằng máy làm sữa hạt mini gia đình.</li>
</ul>`,
    task_prompt:
      "Bạn đang muốn áp dụng thực đơn thực dưỡng cho bản thân hay cho người thân trong gia đình? Hãy chia sẻ mục tiêu sức khỏe của bạn để mở khóa tải tài liệu nhé!",
    downloads: 264,
    sort: 3,
  },
  {
    slug: "huong-dan-can-bang-duong-huyet-mo-mau-tu-nhien",
    title: "Phác Đồ Thực Hành Cân Bằng Đường Huyết, Mỡ Máu & Huyết Áp Tự Nhiên",
    folder_path: "02. Phác Đồ & Chữa Lành Tự Nhiên / Tiểu Đường & Tim Mạch",
    doc_type: "pdf",
    access_mode: "survey",
    price: 0,
    drive_url: "https://drive.google.com/file/d/1phac-do-duong-huyet-mo-mau/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1phac-do-chua-lanh",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Duy Vo (@quocduy2401)",
    pages: 52,
    file_size: "3.9 MB",
    summary:
      "Tài liệu tổng hợp từ chuỗi bài giảng chuyên sâu của Duy Vo về cơ chế điều hòa đường huyết, giảm mỡ máu, mỡ gan và ổn định huyết áp bằng ăn uống & vận động.",
    highlights: [
      "Hiểu rõ nguyên nhân gốc rễ gây kháng Insulin, tiểu đường tuýp 2 và gan nhiễm mỡ",
      "Cách thay thế gạo trắng bằng gạo lứt đúng định lượng mà không làm tăng đường máu",
      "Lịch trình sinh hoạt mẫu trong ngày: Hít thở sâu, tắm nắng, ăn uống, giấc ngủ",
      "Danh mục các thực phẩm cần kiêng cữ và các thảo dược hỗ trợ chuyển hóa",
    ].join("\n"),
    review_html: `<h3>1. Tóm tắt nội dung</h3>
<p>Tài liệu hệ thống hóa các kiến thức khoa học dễ hiểu từ loạt bài giảng về <strong>Tiểu đường, Mỡ máu cao và Tai biến đột quỵ</strong> trên kênh YouTube Duy Vo.</p>
<h3>2. Điểm nhấn chuyên môn</h3>
<ul>
  <li>Giải thích cơ chế tự điều chỉnh của gan, tụy và mạch máu khi giảm tải đường tinh luyện và chất béo xấu.</li>
  <li>Hướng dẫn cách theo dõi chỉ số sức khỏe tại nhà kết hợp chế độ ăn thực vật toàn phần.</li>
</ul>`,
    task_prompt:
      "Khảo sát nhanh: Chỉ số sức khỏe nào bạn đang quan tâm nhất hiện nay (Đường huyết, Mỡ máu, Gan nhiễm mỡ hay Huyết áp)?",
    downloads: 389,
    sort: 4,
  },
  {
    slug: "phac-do-phuc-hoi-da-day-dai-trang-duong-ruot",
    title: "Cẩm Nang Phục Hồi Viêm Loét Trào Ngược Dạ Dày, Đại Tràng & Đường Ruột",
    folder_path: "02. Phác Đồ & Chữa Lành Tự Nhiên / Tiêu Hoá & Thải Độc",
    doc_type: "doc",
    access_mode: "bundle",
    price: 0,
    drive_url: "https://docs.google.com/document/d/1phuc-hoi-da-day-duong-ruot/edit?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1phac-do-chua-lanh",
    affiliate_url: "",
    bundle_product_id: 37,
    cover: "",
    author: "Duy Vo & Thực Dưỡng Phúc Thọ",
    pages: 38,
    file_size: "2.4 MB",
    summary:
      "Tặng phẩm đặc biệt dành cho khách hàng mua sản phẩm hỗ trợ tiêu hóa / kiềm hóa tại Thực Dưỡng Phúc Thọ: Hướng dẫn chi tiết cách xử lý trào ngược, viêm loét dạ dày và táo bón lâu năm.",
    highlights: [
      "Mối liên hệ mật thiết giữa Tâm bệnh (căng thẳng, mất ngủ) và bệnh Dạ dày - Đại tràng",
      "Công thức pha bột sắn dây nguyên chất, mơ muối lâu năm và tương Tamari trung hòa axit dạ dày",
      "Cách sử dụng Canh Dưỡng Sinh & Tinh chất mơ giúp làm lành niêm mạc tiêu hóa",
      "Quy tắc nhai kỹ 50–100 lần để giảm 70% gánh nặng cho dạ dày ngay trong 7 ngày đầu",
    ].join("\n"),
    review_html: `<h3>1. Giới thiệu tài liệu tặng kèm</h3>
<p>Đây là tài liệu hướng dẫn thực hành chi tiết dành tặng quý khách hàng sử dụng các sản phẩm dưỡng sinh tiêu hóa (như <em>Canh dưỡng sinh Đài Loan, Tinh chất mơ, المơ muối 8 năm, Bột sắn dây</em>) tại <strong>Thực Dưỡng Phúc Thọ</strong>.</p>
<h3>2. Nội dung hướng dẫn</h3>
<ul>
  <li>Liều lượng và thời điểm vàng uống trợ phương thực dưỡng trong ngày (trước ăn sáng, khi đau cấp, trước khi ngủ).</li>
  <li>Thực đơn mềm, dễ tiêu hóa trong 21 ngày phục hồi niêm mạc dạ dày và đại tràng.</li>
</ul>`,
    task_prompt: "",
    downloads: 192,
    sort: 5,
  },
  {
    slug: "cam-nang-bao-duong-than-va-xuong-khop",
    title: "Cẩm Nang Bảo Dưỡng Thận (Gốc Của Sự Sống) & Phục Hồi Xương Khớp",
    folder_path: "02. Phác Đồ & Chữa Lành Tự Nhiên / Thận & Xương Khớp",
    doc_type: "pdf",
    access_mode: "bundle",
    price: 0,
    drive_url: "https://drive.google.com/file/d/1bao-duong-than-xuong-khop/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1phac-do-chua-lanh",
    affiliate_url: "",
    bundle_product_id: 42,
    cover: "",
    author: "Duy Vo (@quocduy2401)",
    pages: 64,
    file_size: "5.1 MB",
    summary:
      "Thận là gốc của tiên thiên và chủ về cốt tủy. Tài liệu hướng dẫn cách nuôi dưỡng chức năng thận, phòng ngừa sỏi thận - sỏi mật và giảm đau nhức xương khớp tự nhiên.",
    highlights: [
      "Tại sao Đông Y gọi Thận là gốc của sự sống? Dấu hiệu nhận biết thận suy yếu sớm",
      "Công thức trà đậu đỏ nhỏ (Xích tiểu đậu), trà gạo lứt bancha và áp nước gừng ấm thận",
      "Giải đáp khoa học: Nhịn ăn sáng sai cách ảnh hưởng thế nào đến sỏi mật, sỏi thận?",
      "Bài tập vận động nhẹ, tắm nắng bổ sung D3 giúp xương chắc khỏe ở tuổi trung niên",
    ].join("\n"),
    review_html: `<h3>1. Tóm tắt tài liệu</h3>
<p>Đúc kết từ bài giảng <em>"Thận là gốc của sự sống"</em> và chuyên đề <em>"Sức khỏe của Thận &amp; Xương khớp"</em> trên kênh Duy Vo, kết hợp hướng dẫn sử dụng <strong>Đậu đỏ nhỏ (Xích tiểu đậu)</strong> và các thảo dược dưỡng thận.</p>
<h3>2. Quyền lợi người đọc</h3>
<p>Quý khách mua <strong>Đậu đỏ nhỏ (Xích tiểu đậu)</strong> hoặc bất kỳ đơn hàng nào tại Thực Dưỡng Phúc Thọ đều được mở khóa tải miễn phí trọn bộ tài liệu này.</p>`,
    task_prompt: "",
    downloads: 175,
    sort: 6,
  },
  {
    slug: "slide-co-che-tu-chua-lanh-va-autophagy",
    title: "Slide Bài Giảng: Cơ Chế Tự Chữa Lành Kỳ Diệu & Tự Thực (Autophagy)",
    folder_path: "03. Bài Trình Chiếu & Slide Bài Giảng / Slide Livestream Duy Vo",
    doc_type: "ppt",
    access_mode: "free",
    price: 0,
    drive_url: "https://docs.google.com/presentation/d/1slide-tu-chua-lanh-autophagy/edit?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1slide-bai-giang",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Duy Vo (@quocduy2401)",
    pages: 45,
    file_size: "12.2 MB",
    summary:
      "Bộ bài trình chiếu (PowerPoint / Google Slides) minh họa trực quan cơ chế tự chữa lành của tế bào, giải Nobel Y học 2016 về Autophagy và 3 trụ cột phục hồi sức khỏe.",
    highlights: [
      "45 trang slide thiết kế trực quan, sơ đồ hóa dễ hiểu, chữ lớn rõ ràng",
      "Minh họa cơ chế Tự thực tế bào (Autophagy) khi cơ thể được nghỉ ngơi tiêu hóa đúng cách",
      "Sơ đồ cân bằng Kiềm - Axit và vai trò của vi chất tự nhiên trong tái tạo mô",
      "Tài liệu mở miễn phí phục vụ cộng đồng học tập và chia sẻ kiến thức sức khỏe",
    ].join("\n"),
    review_html: `<h3>1. Giới thiệu Bộ Slide Bài Giảng</h3>
<p>Đây là bộ bài trình chiếu chính thức dùng trong các buổi Livestream chia sẻ của <strong>Duy Vo</strong> về đề tài <em>Khả năng tự chữa lành kỳ diệu của cơ thể</em>.</p>
<h3>2. Bố cục Slide (45 trang)</h3>
<ul>
  <li><strong>Slide 1–12:</strong> Tại sao bác sĩ tốt nhất chính là hệ miễn dịch bên trong cơ thể bạn?</li>
  <li><strong>Slide 13–28:</strong> Cơ chế Autophagy (Tự thực) và ứng dụng trong thanh lọc cơ thể.</li>
  <li><strong>Slide 29–45:</strong> 3 điều kiện cần và đủ để kích hoạt cơ chế tự chữa lành mỗi ngày.</li>
</ul>`,
    task_prompt: "",
    downloads: 512,
    sort: 7,
  },
  {
    slug: "slide-talkshow-song-can-bang-than-tam-tri",
    title: "Slide TalkShow: Sống Cân Bằng Thân - Tâm - Trí & Hoá Giải Trầm Cảm Mất Ngủ",
    folder_path: "03. Bài Trình Chiếu & Slide Bài Giảng / Slide Livestream Duy Vo",
    doc_type: "ppt",
    access_mode: "survey",
    price: 0,
    drive_url: "https://docs.google.com/presentation/d/1slide-talkshow-than-tam-tri/edit?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1slide-bai-giang",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Duy Vo (@quocduy2401)",
    pages: 38,
    file_size: "9.8 MB",
    summary:
      "Bộ slide từ chương trình TalkShow của Duy Vo: Giải mã căn nguyên căng thẳng, mất ngủ, trầm cảm thời hiện đại và phương pháp tìm lại sự bình an, giấc ngủ tự nhiên.",
    highlights: [
      "Phân tích sinh lý học của giấc ngủ và nhịp sinh học tự nhiên (Circadian Rhythm)",
      "3 bước đưa hệ thần kinh từ trạng thái căng thẳng (Giao cảm) về thư giãn (Đối giao cảm)",
      "Thực hành hít thở bụng và buông thư trước khi ngủ giúp ngủ sâu không lệ thuộc thuốc",
      "Bài học từ cổ nhân và thiền dưỡng sinh giúp giữ tâm an trước biến động cuộc sống",
    ].join("\n"),
    review_html: `<h3>1. Điểm nổi bật của bộ Slide</h3>
<p>Bộ slide tổng hợp từ buổi <strong>TalkShow: Sống Cân Bằng Để Tìm Thấy Hạnh Phúc Tự Do</strong> và chuyên đề <strong>Sức Khỏe Tinh Thần</strong> trên kênh YouTube Duy Vo.</p>
<h3>2. Ứng dụng thực tế</h3>
<p>Rất phù hợp cho người làm việc trí óc căng thẳng, người thường xuyên trằn trọc khó ngủ hoặc thức giấc giữa đêm.</p>`,
    task_prompt:
      "Bạn hiện có gặp tình trạng khó ngủ, ngủ không sâu giấc hay căng thẳng công việc không? Hãy để lại chia sẻ ngắn để tải bộ Slide này nhé!",
    downloads: 240,
    sort: 8,
  },
  {
    slug: "slide-5-che-do-dinh-duong-va-wfpb",
    title: "Bài Trình Chiếu: Vấn Đề Dinh Dưỡng Hiện Đại & 5 Chế Độ Ăn Tốt Cho Sức Khoẻ",
    folder_path: "03. Bài Trình Chiếu & Slide Bài Giảng / Slide Dinh Dưỡng",
    doc_type: "ppt",
    access_mode: "free",
    price: 0,
    drive_url: "https://docs.google.com/presentation/d/1slide-5-che-do-dinh-duong/edit?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1slide-bai-giang",
    affiliate_url: "",
    bundle_product_id: null,
    cover: "",
    author: "Duy Vo (@quocduy2401)",
    pages: 50,
    file_size: "14.0 MB",
    summary:
      "So sánh khách quan, khoa học giữa các chế độ dinh dưỡng phổ biến trên thế giới và lý do Thực phẩm toàn phần nguồn gốc thực vật (WFPB) kết hợp Thực dưỡng là giải pháp tối ưu.",
    highlights: [
      "Bức tranh thực trạng thực phẩm công nghiệp, siêu chế biến, vi nhựa và kim loại nặng",
      "So sánh 5 chế độ ăn nổi tiếng: Địa Trung Hải, Okinawa, WFPB, Keto/Low-Carb, Thực dưỡng",
      "Cách áp dụng linh hoạt theo thể trạng người Việt Nam mà vẫn đủ chất, tràn đầy năng lượng",
    ].join("\n"),
    review_html: `<h3>1. Nội dung bài trình chiếu</h3>
<p>Tài liệu đi kèm video bài giảng đầu tiên trong danh sách phát <strong>Dinh Dưỡng và Sức Khoẻ (85 video)</strong> trên kênh Duy Vo, giúp người xem có cái nhìn hệ thống và biểu đồ trực quan.</p>`,
    task_prompt: "",
    downloads: 310,
    sort: 9,
  },
  {
    slug: "sach-cot-tuy-thuc-duong-va-phong-tri-benh-ohsawa",
    title: "Sách: Cốt Tủy Thực Dưỡng & Phương Pháp Trường Sinh (Tiên Sinh Ohsawa)",
    folder_path: "04. Tủ Sách Thực Dưỡng & Affiliate / Sách Gối Đầu Giường",
    doc_type: "book",
    access_mode: "affiliate",
    price: 125000,
    drive_url: "https://drive.google.com/file/d/1preview-cot-tuy-thuc-duong/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1tu-sach-thuc-duong",
    affiliate_url: "https://shopee.vn/search?keyword=sach%20thuc%20duong%20ohsawa",
    bundle_product_id: 39,
    cover: "",
    author: "George Ohsawa (Bản dịch Thực dưỡng)",
    pages: 280,
    file_size: "Bản đọc thử PDF (3.2 MB)",
    summary:
      "Tác phẩm kinh điển đặt nền móng cho phương pháp Thực dưỡng (Macrobiotics) của Tiên sinh George Ohsawa — cuốn sách gối đầu giường cho mọi người thực hành dưỡng sinh.",
    highlights: [
      "7 tiêu chuẩn của một người khỏe mạnh toàn diện (không mệt mỏi, ăn ngon, ngủ sâu, trí nhớ tốt, vui vẻ, quyết đoán, công bằng)",
      "Triết lý Vô song nguyên lý Âm Dương ứng dụng vào y học và đời sống",
      "Có bản đọc thử chương đầu miễn phí trên Google Drive + Link đặt mua sách in chính hãng",
    ].join("\n"),
    review_html: `<h3>1. Review cuốn sách kinh điển về Thực dưỡng</h3>
<p>Nếu bạn muốn tìm hiểu tới tận gốc rễ triết lý phương Đông đằng sau hạt gạo lứt và nghệ thuật ăn uống quân bình, bộ sách của <strong>Tiên sinh George Ohsawa</strong> là tài liệu không thể bỏ qua.</p>
<h3>2. Điểm đắt giá nhất trong sách</h3>
<p>Thay vì chỉ nhìn vào triệu chứng bệnh, cuốn sách giúp người đọc tự đánh giá sức khỏe của chính mình qua <strong>7 điều kiện sức khỏe</strong> (từ thể chất đến tinh thần) và tự làm bác sĩ cho bản thân qua từng bữa ăn.</p>
<h3>3. Hướng dẫn mua sách hoặc nhận bản đọc thử</h3>
<ul>
  <li>Bạn có thể bấm <strong>Đọc thử / Xem trước</strong> bản trích dẫn PDF ngay trên trang này.</li>
  <li>Hoặc đặt mua sách giấy chính hãng qua <strong>Link Affiliate nhà sách uy tín</strong> / đặt kèm đơn hàng tại <strong>Thực Dưỡng Phúc Thọ</strong>.</li>
</ul>`,
    task_prompt: "",
    downloads: 615,
    sort: 10,
  },
  {
    slug: "sach-nhan-to-enzyme-hiromi-shinya",
    title: "Sách: Bộ 4 Cuốn Nhân Tố Enzyme - Phương Pháp Sống Lành Mạnh (BS. Hiromi Shinya)",
    folder_path: "04. Tủ Sách Thực Dưỡng & Affiliate / Sách Gối Đầu Giường",
    doc_type: "book",
    access_mode: "affiliate",
    price: 340000,
    drive_url: "https://drive.google.com/file/d/1preview-nhan-to-enzyme/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1tu-sach-thuc-duong",
    affiliate_url: "https://shopee.vn/search?keyword=bo%20sach%20nhan%20to%20enzyme%20hiromi%20shinya",
    bundle_product_id: 44,
    cover: "",
    author: "GS. BS. Hiromi Shinya",
    pages: 320,
    file_size: "Tóm tắt sách PDF (2.9 MB)",
    summary:
      "Qua việc nội soi hơn 300.000 dạ dày và đường ruột bệnh nhân, GS.BS Hiromi Shinya chứng minh: Chế độ ăn 85% thực vật toàn phần (gạo lứt, ngũ cốc, rau củ) tạo ra đường ruột đẹp và tuổi thọ khỏe mạnh.",
    highlights: [
      "Bằng chứng y học lâm sàng từ hơn 300.000 ca nội soi đường ruột tại Mỹ và Nhật Bản",
      "Khái niệm 'Enzyme diệu kỳ' và những thói quen ăn uống làm cạn kiệt nguồn năng lượng sống",
      "Khuyến nghị tỷ lệ vàng: 85–90% thực phẩm thực vật toàn phần + 10–15% đạm sạch",
      "Bản tóm tắt 15 trang ý chính (PDF) + Link mua trọn bộ sách giấy ưu đãi qua Affiliate",
    ].join("\n"),
    review_html: `<h3>1. Vì sao kênh Duy Vo khuyên đọc bộ sách Nhân Tố Enzyme?</h3>
<p>Nhiều người còn nghi ngại liệu ăn gạo lứt, ngũ cốc và rau củ theo Thực dưỡng có thiếu chất hay không? Bộ sách <strong>Nhân Tố Enzyme</strong> của bác sĩ phẫu thuật hàng đầu thế giới <strong>Hiromi Shinya</strong> mang đến góc nhìn khoa học Tây Y hiện đại hoàn toàn đồng điệu với Thực dưỡng cổ truyền.</p>
<h3>2. Tóm tắt những bài học quan trọng</h3>
<ul>
  <li>Đường ruột khỏe đẹp (hồng hào, mềm mại, không túi thừa) quyết định 80% hệ miễn dịch.</li>
  <li>Tại sao sữa bò công nghiệp, thịt đỏ nhiều mỡ và thực phẩm oxy hóa lại làm suy kiệt enzyme?</li>
  <li>Cách uống nước tốt, ăn trái cây trước bữa ăn và nhai kỹ để tiết kiệm enzyme tiêu hóa.</li>
</ul>`,
    task_prompt: "",
    downloads: 540,
    sort: 11,
  },
  {
    slug: "so-tay-tra-cuu-thuc-duong-phuc-tho-ban-dac-biet",
    title: "Sổ Tay Tra Cứu Thực Dưỡng & Trợ Phương Chữa Lành Tự Nhiên (Bản Đặc Biệt)",
    folder_path: "04. Tủ Sách Thực Dưỡng & Affiliate / Ebook Chuyên Sâu",
    doc_type: "book",
    access_mode: "paid",
    price: 99000,
    drive_url: "https://drive.google.com/file/d/1so-tay-thuc-duong-phuc-tho-vip/view?usp=sharing",
    drive_folder_url: "https://drive.google.com/drive/folders/1tu-sach-thuc-duong",
    affiliate_url: "",
    bundle_product_id: 37,
    cover: "",
    author: "Duy Vo & Cửa Hàng Thực Dưỡng Phúc Thọ",
    pages: 145,
    file_size: "15.6 MB",
    summary:
      "Ấn phẩm tổng hợp đầy đủ nhất (145 trang màu): Bảng tra cứu trợ phương cấp cứu tại nhà, công thức pha chế 30 loại thức uống dưỡng sinh và phác đồ ăn uống theo từng nhóm bệnh.",
    highlights: [
      "145 trang trình bày màu sắc nét, có mục lục tương tác bấm chuyển trang nhanh",
      "Hướng dẫn 30 trợ phương ngoại trị & nội trị tự nhiên (áp gừng, đắp cao khoai sọ, trà bình minh...)",
      "Miễn phí 100% khi nhập Mã đơn hàng đã mua tại Thực Dưỡng Phúc Thọ hoặc ủng hộ 99.000₫ phí biên soạn",
    ].join("\n"),
    review_html: `<h3>1. Giới thiệu Sổ Tay Tra Cứu Bản Đặc Biệt</h3>
<p>Được biên soạn công phu nhằm giúp mỗi gia đình có một cuốn <strong>"Tủ thuốc thực dưỡng tại gia"</strong> để tra cứu bất cứ khi nào gặp các vấn đề sức khỏe thường ngày (cảm sốt, ho, đau bụng, đầy hơi, mất ngủ, đau nhức xương khớp...).</p>
<h3>2. Hai cách nhận tài liệu</h3>
<ul>
  <li><strong>Cách 1 (Miễn phí tặng kèm đơn hàng):</strong> Nếu bạn đã đặt mua bất kỳ sản phẩm nào tại website <strong>Thực Dưỡng Phúc Thọ</strong>, chỉ cần nhập <strong>Mã đơn hàng</strong> (VD: <code>TD...</code>) để tải miễn phí ngay lập tức!</li>
  <li><strong>Cách 2 (Ủng hộ kinh phí biên soạn 99.000₫):</strong> Chuyển khoản qua tài khoản BIDV của cửa hàng để mở khóa tải trọn bộ file PDF chất lượng cao.</li>
</ul>`,
    task_prompt: "",
    downloads: 188,
    sort: 12,
  },
];
