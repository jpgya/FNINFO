document.documentElement.classList.add('telop-enabled');
document.body.classList.add('has-telop');
(function(){
    const telop = document.getElementById('site-telop');
    const btn = document.getElementById('telop-close');
    const key = 'telop-closed-until';

    
    try {
      const val = localStorage.getItem(key);
      if (val && +val > Date.now()) {
        telop.style.display = 'none';
        document.body.classList.remove('has-telop');
      }
    } catch(e){}

    btn.addEventListener('click', () => {
      telop.style.display = 'none';
      document.body.classList.remove('has-telop');
      try {
        const until = Date.now() + 24 * 60 * 60 * 1000; 
        localStorage.setItem(key, String(until));
      } catch(e){}
    });
})();