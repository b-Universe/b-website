/* The worker keeps costly regular expressions away from the editor's UI thread. */
self.onmessage = ({data}) => {
  const {id,pattern,flags,text,replacement,maxMatches} = data;
  try {
    const re = new RegExp(pattern,flags);
    const matches = [];
    let match;
    while ((match = re.exec(text)) !== null && matches.length < maxMatches) {
      matches.push({index:match.index,value:match[0],groups:match.slice(1),named:match.groups || null});
      if (!re.global && !re.sticky) break;
      if (match[0] === '') {
        const idx = re.lastIndex;
        if (re.unicode || re.unicodeSets) {
          const first = text.charCodeAt(idx);
          const second = text.charCodeAt(idx+1);
          re.lastIndex += first >= 0xD800 && first <= 0xDBFF && second >= 0xDC00 && second <= 0xDFFF ? 2 : 1;
        } else re.lastIndex += 1;
        if (re.lastIndex > text.length) break;
      }
    }
    const capped = matches.length === maxMatches;
    const replaced = text.replace(new RegExp(pattern,flags),replacement);
    self.postMessage({id,ok:true,matches,capped,replaced});
  } catch(error) {
    self.postMessage({id,ok:false,error:error.message || String(error)});
  }
};
