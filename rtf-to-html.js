'use strict'
//module.exports = rtfToHTML

function outputTemplate (doc, defaults, content) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
    body {
      margin-left: ${doc.marginLeft / 20}pt;
      margin-right: ${doc.marginRight / 20}pt;
      margin-top: ${doc.marginTop / 20}pt;
      margin-bottom: ${doc.marginBottom / 20}pt;
      font-size: ${defaults.fontSize / 2}pt;
      text-indent: ${defaults.firstLineIndent / 20}pt;
    }
    </style>
  </head>
  <body>
    ${content.replace(/\n/, '\n    ')}
  </body>
</html>
`
}

function rtfToHTML (doc, options) {
  const defaults = Object.assign({
    font: doc.style.font || {name: 'Times', family: 'roman'},
    fontSize: doc.style.fontSize || 24,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    foreground: {red: 0, blue: 0, green: 0},
    background: {red: 255, blue: 255, green: 255},
    firstLineIndent: doc.style.firstLineIndent || 0,
    indent: 0,
    align: 'left',
    valign: 'normal',

    paraBreaks: '\n\n',
    paraTag: 'p',
    template: outputTemplate
  }, options || {})
  const content = doc.content.map(para => renderPara(para, defaults)).filter(html => html != null).join(defaults.paraBreaks)
  return defaults.template(doc, defaults, content)
}

function font (ft) {
  const name = ft.name.replace(/-\w+$/, '')
  const family = genericFontMap[ft.family]
  if (name === 'ZapfDingbatsITC') return ''
  return 'font-family: ' + name + (family ? `, ${family}` : '')
}

const genericFontMap = {
  roman: 'serif',
  swiss: 'sans-serif',
  script: 'cursive',
  decor: 'fantasy',
  modern: 'sans-serif',
  tech: 'monospace',
  bidi: 'serif'
}

function colorEq (aa, bb) {
  return aa.red === bb.red && aa.blue === bb.blue && aa.green === bb.green
}

function CSS (chunk, defaults) {
  let css = ''
  if (chunk.style.foreground != null && chunk.style.foreground !== undefined && !colorEq(chunk.style.foreground, defaults.foreground)) {
    css += `color: rgb(${chunk.style.foreground.red}, ${chunk.style.foreground.green}, ${chunk.style.foreground.blue});`
  }
  if (chunk.style.background != null && chunk.style.background !== undefined && !colorEq(chunk.style.background, defaults.background)) {
    css += `background-color: rgb(${chunk.style.background.red}, ${chunk.style.background.green}, ${chunk.style.background.blue});`
  }
  if (chunk.style.firstLineIndent != null && chunk.style.firstLineIndent !== undefined && chunk.style.firstLineIndent > 0 && chunk.style.firstLineIndent !== defaults.firstLineIndent) {
    css += `text-indent: ${chunk.style.firstLineIndent / 20}pt;`
  }
  if (chunk.style.indent != null && chunk.style.indent !== undefined && chunk.style.indent !== defaults.indent) {
    css += `padding-left: ${chunk.style.indent / 20}pt;`
  }
  if (chunk.style.align != null && chunk.style.align !== undefined && chunk.style.align !== defaults.align) {
    css += `text-align: ${chunk.style.align};`
  }
  if (chunk.style.fontSize != null && chunk.style.fontSize !== undefined && chunk.style.fontSize !== defaults.fontSize) {
    css += `font-size: ${chunk.style.fontSize / 2}pt;`
  }
  if (!defaults.disableFonts && chunk.style.font != null && chunk.style.font !== undefined && chunk.style.font.name !== defaults.font.name) {
    css += font(chunk.style.font)
  }
  return css
}

function styleTags (chunk, defaults) {
  let open = ''
  let close = ''
  //For each styling, if the styling specific to this chunk is null/undefined, set if the default is true;
  //if there is a styling specified for this chunk, set it if true
  if ( ( ((chunk.style.italic === undefined) || (chunk.style.italic == null)) && (defaults.italic == true) )
      || (chunk.style.italic == true) ) {
    open += '<em>'
    close = '</em>' + close
  }
  if ( ( ((chunk.style.bold === undefined) || (chunk.style.bold == null)) && (defaults.bold == true) )
      || (chunk.style.bold == true) ) {
    open += '<strong>'
    close = '</strong>' + close
  }
  if ( ( ((chunk.style.strikethrough === undefined) || (chunk.style.strikethrough == null)) && (defaults.strikethrough == true) )
      || (chunk.style.strikethrough == true) ) {
    open += '<s>'
    close = '</s>' + close
  }
  if ( ( ((chunk.style.underline === undefined) || (chunk.style.underline == null)) && (defaults.underline == true) )
      || (chunk.style.underline == true) ) {
    open += '<u>'
    close = '</u>' + close
  }
  if ( ( ((chunk.style.valign === undefined) || (chunk.style.valign == null)) && (defaults.valign == 'super') )
      || (chunk.style.valign == 'super') ) {
    open += '<sup>'
    close = '</sup>' + close
  } else if ( ( ((chunk.style.valign === undefined) || (chunk.style.valign == null)) && (defaults.valign == 'sub') )
      || (chunk.style.valign == 'sub') ) {
      open += '<sub>'
      close = '</sub>' + close
  }
  return {open, close}
}

function renderPara (para, defaults) {
  if (para === null || para === undefined || !para.content || para.content.length === 0) return
  var style = CSS(para, defaults)
  const tags = styleTags(para, defaults)
  const pdefaults = Object.assign({}, defaults)
  for (let item of Object.keys(para.style)) {
    if (para.style[item] != null && para.style[item] != undefined) pdefaults[item] = para.style[item]
  }
  const paraTag = defaults.paraTag
  
  style = style ? ' style="' + style + '"' : '';
  var paraContent;
  if (typeof para.content == 'undefined') {
        //Allow for a single span, not organized in a paragraph
        paraContent = `${tags.open}${para.value}${tags.close}`;
        //console.log("Use value: " + para.value);
  }
  else {
        //A true paragraph will contain one or more spans
        paraContent = para.content.map(span => renderSpan(span, pdefaults)).join('');
        if (paraContent.length < 1) {
            paraContent = "&nbsp;";
        }
  }
  
  return `<${paraTag}${style ? ' style="' + style + '"' : ''}>${tags.open}${para.content.map(span => renderSpan(span, pdefaults)).join('')}${tags.close}</${paraTag}>`
}

function renderSpan (span, defaults) {
  const style = CSS(span, defaults)
  const tags = styleTags(span, defaults)
  const value = `${tags.open}${span.value}${tags.close}`
  if (style) {
    return `<span style="${style}">${value}</span>`
  } else {
    return value
  }
}
