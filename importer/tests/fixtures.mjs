// Entirely synthetic. Never add public article bodies to repository fixtures.
export const articleURL='https://matters.town/a/synthetic123';
export function syntheticPage(change={}){
  const article={__typename:'Article',id:'synthetic',shortHash:'synthetic123',title:'Synthetic title',state:'active',access:{circle:null},author:{__ref:'User:synthetic'},license:'cc_by_nc_nd_4',contents:{html:'<p>First &amp; paragraph.</p><h2>Second section</h2><p>Second paragraph.<br>Next line.</p>'},...change};
  return '<!doctype html><script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{apolloState:{'Article:synthetic':article,'User:synthetic':{displayName:'Example author',status:{state:'active'}}}}}}).replace(/</g,'\\u003c')+'</script>';
}
