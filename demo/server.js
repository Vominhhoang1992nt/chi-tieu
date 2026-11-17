function PLAN_FIXTURE(edits, empty){
  if (empty) {
    const mk=(n,r)=>({name:n,amount:0,row:r});
    const blocks=[
      {name:'THU NHẬP',key:'thunhap',kind:'in',total:0,inBudget:false,
       items:[mk('LƯƠNG CÔNG VIỆC',4),mk('TIỀN DƯ THÁNG TRƯỚC',5)]},
      {name:'CHI PHÍ BẮT BUỘC',key:'chiphibatbuoc',kind:'out',total:0,inBudget:true,
       items:[mk('TIỀN THUÊ NHÀ',12),mk('TIỀN XĂNG',13),mk('TIỀN ĐIỆN THOẠI',14),
              mk('TIỀN ĂN SÁNG',15),mk('TIỀN ĂN TRƯA',16),mk('CAFE',21)]},
      {name:'CHI PHÍ KHÔNG BẮT BUỘC',key:'chiphikhongbatbuoc',kind:'out',total:0,inBudget:true,
       items:[mk('GIÁO DỤC',28),mk('QUẦN ÁO',30),mk('TẶNG TIỀN',37)]},
      {name:'NỢ',key:'no',kind:'debt',total:0,inBudget:true,
       items:[mk('MƯỢN TIỀN',57),mk('TIỀN SHOPEE',58)]},
      {name:'TIẾT KIỆM ĐẦU TƯ',key:'tietkiemdautu',kind:'save',total:0,inBudget:false,
       items:[mk('TIẾT KIỆM',74)]}];
    return {sheet:'DỰ TOÁN 2026',month:12,col:'Q',monthsWithPlan:[11],
      income:0,spend:0,debt:0,save:0,budget:0,inBudget:['out','debt'],
      left:0,has:false,blocks:blocks};
  }
  return PLAN_REAL(edits);
}
function PLAN_REAL(edits){
  const blocks=[
    {name:'THU NHẬP',key:'thunhap',kind:'in',total:25000000,inBudget:false,
     items:[{name:'LƯƠNG CÔNG VIỆC',amount:25000000,row:4}]},
    {name:'CHI PHÍ BẮT BUỘC',key:'chiphibatbuoc',kind:'out',total:0,inBudget:true,
     items:[{name:'TIỀN THUÊ NHÀ',amount:5000000,row:12},{name:'TIỀN ĂN TRƯA',amount:2000000,row:16},
            {name:'CAFE',amount:600000,row:21}]},
    {name:'CHI PHÍ KHÔNG BẮT BUỘC',key:'chiphikhongbatbuoc',kind:'out',total:0,inBudget:true,
     items:[{name:'QUẦN ÁO',amount:1000000,row:30},{name:'TẶNG TIỀN',amount:1500000,row:37}]},
    {name:'NỢ',key:'no',kind:'debt',total:0,inBudget:true,
     items:[{name:'TIỀN SHOPEE',amount:3000000,row:58},{name:'MƯỢN TIỀN',amount:1000000,row:57}]},
    {name:'TIẾT KIỆM ĐẦU TƯ',key:'tietkiemdautu',kind:'save',total:0,inBudget:false,
     items:[{name:'TIẾT KIỆM',amount:4000000,row:74}]}];
  (edits||[]).forEach(e=>blocks.forEach(b=>b.items.forEach(it=>{ if(it.row===e.row) it.amount=e.amount; })));
  blocks.forEach(b=>{ if(b.kind!=='in') b.total=b.items.reduce((a,x)=>a+x.amount,0); });
  const bud=blocks.filter(b=>b.inBudget).reduce((a,b)=>a+b.total,0);
  return {sheet:'DỰ TOÁN 2026',month:10,col:'O',monthsWithPlan:[10,11],
    income:25000000,
    spend:blocks.filter(b=>b.kind==='out').reduce((a,b)=>a+b.total,0),
    debt:blocks.filter(b=>b.kind==='debt').reduce((a,b)=>a+b.total,0),
    save:blocks.filter(b=>b.kind==='save').reduce((a,b)=>a+b.total,0),
    budget:bud,inBudget:['out','debt'],left:0,has:bud>0,blocks:blocks};
}
const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
/* Phục vụ thẳng từ thư mục gốc của repo: không giữ bản sao index.html thứ hai,
   vì hai bản sẽ lệch nhau ngay lần sửa đầu tiên. index.html được viết lại
   EXEC_URL ngay lúc phục vụ để trỏ về mock này thay vì Apps Script thật. */
const DIR=require('path').join(__dirname,'..');
const PORT=8811;
const LOG=[];
const MT={'.html':'text/html','.js':'text/javascript','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer((req,res)=>{
  const u=url.parse(req.url,true);
  if(u.pathname==='/exec'){
    let body='';
    req.on('data',c=>body+=c);
    req.on('end',()=>{
      const isPost=req.method==='POST';
      let action,payload;
      if(isPost){ try{const b=JSON.parse(body); action=b.api; payload=b.payload;}catch(e){} }
      else { action=u.query.api; try{payload=JSON.parse(u.query.payload||'{}');}catch(e){} }
      LOG.push({method:req.method,action,ct:req.headers['content-type']||'',
                pin:payload&&payload.pin,token:(isPost?(JSON.parse(body||'{}').token):u.query.token)});
      let out={ok:false,message:'PIN không đúng.'};
      if(action==='setBudget'&&payload&&payload.pin==='123456'){
        out={ok:true,ms:30,budget:{amount:15000000,own:payload.scope==='month',source:'manual',manual:15000000},message:'Hạn mức đã đặt'};
      } else if(action==='setBudgetSource'){
        const src=payload.source;
        const b = src==='off' ? {amount:0,own:false,source:'off',manual:15000000}
          : src==='manual' ? {amount:15000000,own:false,source:'manual',manual:15000000}
          : {amount:24010092,own:true,source:'plan',planSpend:6900000,planDebt:17110092,planSave:3000000,planIncome:34000000,manual:15000000};
        out={ok:true,ms:25,budget:b,source:src,message:'Hạn mức lấy theo '+src};
      } else if(action==='setShortcuts'){
        const seen={}; const scOut=[];
        (payload.items||[]).forEach(x=>{
          if(!x.label||!x.hu||!x.item) return;
          let base=x.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d')
            .toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,14)||'pt';
          let k=base,n=2; while(seen[k]) k=base+(n++); seen[k]=1;
          scOut.push({key:k,label:x.label,emoji:x.emoji||'•',hu:x.hu,item:x.item,
                      amount:Number(x.amount)||0,custom:true,bad:false});
        });
        out={ok:true,ms:35,shortcuts:scOut,
             message:scOut.length?('Đã lưu '+scOut.length+' phím tắt'):'Đã trả về phím tắt mặc định'};
      } else if(action==='createMonth'){
        const nm='T'+payload.month+'/'+payload.year;
        out={ok:true,ms:420,sheetName:nm,sheets:['T10/2026','T11/2026','T12/2026',nm],
             message:'Đã tạo '+nm+' từ mẫu T11/2026'};
      } else if(action==='setPlanAmounts'){
        out={ok:true,ms:260,plan:PLAN_FIXTURE(payload.edits||[]),
             message:'Đã lưu dự toán '+(payload.edits||[]).length+' khoản mục'};
      } else if(action==='setAlertPct'){
        out={ok:true,ms:20,alertPct:payload.pct,message:'Cảnh báo khi chạm '+payload.pct+'% dự toán'};
      } else if(action==='getPlan'){
        out={ok:true,ms:40,plan:PLAN_FIXTURE([], payload && payload.empty)};
      }
      if(action==='deleteExpense'&&payload&&payload.pin==='123456'){
        out={ok:true,ms:40,todayTotal:0,monthTotal:5000000,txCount:4,message:'Đã xóa giao dịch'};
      }
      if(action==='getTransactions'&&payload&&payload.pin==='123456'){
        const rows=[];
        /* Bộ dữ liệu thử có đủ 4 tình huống:
             - TIỀN THUÊ NHÀ  : cố định, trả đủ 100%        -> KHÔNG được cảnh báo
             - MƯỢN TIỀN      : khối NỢ, trả đủ 100%        -> KHÔNG được cảnh báo
             - TIỀN SHOPEE    : khối NỢ, trả VƯỢT kế hoạch  -> chỉ hiện dạng thông tin
             - TẶNG TIỀN      : không cố định, VƯỢT kế hoạch -> PHẢI cảnh báo đỏ  */
        [['2026-10-03',5000000,'CHI PHÍ BẮT BUỘC','TIỀN THUÊ NHÀ'],
         ['2026-10-05',3000000,'NỢ','TIỀN SHOPEE'],
         ['2026-10-09',1000000,'NỢ','MƯỢN TIỀN'],
         ['2026-10-14',1300000,'CHI PHÍ KHÔNG BẮT BUỘC','QUẦN ÁO'],
         ['2026-10-18',420000,'CHI PHÍ BẮT BUỘC','CAFE'],
         ['2026-10-21',1800000,'CHI PHÍ BẮT BUỘC','TIỀN ĂN TRƯA'],
         ['2026-10-23',285000,'CHI PHÍ BẮT BUỘC','TIỀN ĂN TRƯA']].forEach((r,i)=>{
          rows.push({row:10+i,note:'',dateKey:r[0],
            dateLabel:r[0].slice(8,10)+'/'+r[0].slice(5,7),weekday:'Thứ '+(i+2),
            amount:r[1],hu:r[2],item:r[3],moneyType:'TIỀN MẶT'});
        });
        out={ok:true,ms:80,sheetName:'T10/2026',daysInMonth:31,rows:rows};
      }
      if(action==='setAlertSkip'&&payload&&payload.pin==='123456'){
        let it=payload.items; if(typeof it==='string') it=JSON.parse(it);
        LOG.push({skip:it});
        out={ok:true,ms:30,alertSkip:it,message:'Đã đặt '+it.length+' khoản cố định'};
      }
      if(action==='moveExpense'&&payload&&payload.pin==='123456'){
        LOG.push({move:payload});
        if(!payload.toSheet) out={ok:false,message:'thiếu toSheet'};
        else if(payload.toSheet===payload.sheetName) out={ok:false,message:'Sheet đích trùng sheet nguồn.'};
        else {
          const m=String(payload.toSheet).match(/^T(\d{1,2})\/(\d{4})$/);
          const d=String(payload.date||'');
          const dm=d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if(m&&dm&&(Number(dm[2])!==Number(m[1])||Number(dm[1])!==Number(m[2])))
            out={ok:false,message:'Ngày '+dm[3]+'/'+dm[2]+'/'+dm[1]+' không thuộc sheet '+payload.toSheet+'.'};
          else out={ok:true,ms:95,fromSheet:payload.sheetName,toSheet:payload.toSheet,
                newRow:21,newDateKey:d,todayTotal:0,monthTotal:1125561,txCount:4,
                tx:{row:21,note:(payload.note||'')+' (chi 24/10)',dateKey:d,
                    dateLabel:dm?dm[3]+'/'+dm[2]:'',weekday:'Thứ 2',
                    amount:Number(String(payload.amount).replace(/\D/g,''))||0,
                    hu:payload.hu,item:payload.item,moneyType:payload.moneyType},
                message:'Đã chuyển sang '+payload.toSheet};
        }
      }
      if(action==='getBootstrap'&&payload&&payload.pin==='123456'){
        out={ok:true,ms:42,cached:false,hu:[{v:'ĂN UỐNG',t:'ĂN UỐNG'}],
          items:[{huKey:'ĂN UỐNG',v:'TIỀN ĂN TRƯA',t:'TIỀN ĂN TRƯA'}],
          moneyTypes:['TIỀN MẶT','TÍN DỤNG'],tags:[{tag:'henho',label:'Hẹn hò',emoji:'💕',keys:['henho']}],
          shortcuts:[{key:'trua',label:'Ăn trưa',emoji:'🍚',hu:'ĂN UỐNG',item:'TIỀN ĂN TRƯA'}],
          tagRules:{},mailOn:true,editOn:true,sheets:['T11/2026','T10/2026','T09/2026'],years:[2026],
          activeSheet:'T10/2026',sheetExists:true,todayISO:'2026-10-23',
          defaultDate:'2026-10-23',daysLeft:8,todayTotal:285000,monthTotal:11520000,txCount:38,alertPct:80,alertSkip:['TIỀN THUÊ NHÀ'],alertSkipKinds:['debt','save'],budget:{amount:14100000,own:true,source:'plan',planSpend:10100000,planDebt:4000000,planSave:4000000,planIncome:25000000,manual:12000000}};
      }
      res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
      res.end(JSON.stringify(out));
    });
    return;
  }
  if(u.pathname==='/__log'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify(LOG));}
  let f=path.join(DIR,u.pathname==='/'?'index.html':u.pathname);
  fs.readFile(f,(e,d)=>{
    if(e){res.writeHead(404);return res.end('nf');}
    /* Trỏ app về mock này. Viết lại lúc phục vụ chứ không sửa file trong repo:
       index.html trong repo phải giữ URL thật để bản deploy chạy được. */
    if(path.extname(f)==='.html'){
      d=Buffer.from(String(d).replace(/const EXEC_URL\s*=\s*'[^']*'/,
        "const EXEC_URL  = 'http://127.0.0.1:"+PORT+"/exec'"),'utf8');
    }
    res.writeHead(200,{'Content-Type':MT[path.extname(f)]||'application/octet-stream'});
    res.end(d);
  });
}).listen(PORT,()=>console.log('Mock Apps Script backend: http://127.0.0.1:'+PORT+'/index.html  (PIN 123456)'));
