const API = 'https://api.zalando.com/articles'

fetch(API)
  .then(resp => resp.json())
  .then(json => json.content)
  .then(articles => {
    const main = document.getElementById('articles')
    articles.forEach(article => {
      const div = document.createElement('div')
      div.innerHTML = `<h3><a href="${article.shopUrl}">${article.name}</a></h3> <img src="${article.media.images[0].largeUrl}"/>`
      main.appendChild(div)
    })
  })
