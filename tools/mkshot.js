/* 生成用于视觉验收的静态预览页：跑满 N 帧后把画布转成图片，规避无头合成层问题 */
const fs = require('fs');
const path = require('path');
const [lv, px, py, maxF, atF, out] = process.argv.slice(2);

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const pre = `<script>
(function(){
  var clock=0,n=0,MAXF=${maxF};
  window.__hook=null;
  window.performance.now=function(){return clock;};
  window.requestAnimationFrame=function(cb){
    if(n>=MAXF) return 0;
    setTimeout(function(){ n++; clock+=16.667; if(window.__hook) window.__hook(n); cb(clock); },0);
    return n;
  };
})();
</script>`;
const post = `<script>
setTimeout(function(){
  UMBRA.startLevel(${lv});
  var p=UMBRA.player;
  window.__hook=function(n){
    if(n===${atF}){ p.x=${px}; p.y=${py}; p.vx=0; p.vy=0; p.onGround=false; }
    if(n===${maxF}){
      var cv=document.getElementById('cv');
      var img=new Image();
      img.onload=function(){
        img.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:5';
        document.getElementById('stage').appendChild(img);
      };
      img.src=cv.toDataURL();
    }
  };
},0);
</script>`;
fs.writeFileSync(out, html.replace('<script src="game.js"></script>',
  pre + '<script src="game.js"></script>' + post));
