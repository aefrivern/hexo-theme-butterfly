const cheerio = require('cheerio');
const moment = require('moment');

hexo.extend.filter.register(
  'after_render:html',
  function (locals) {
    const $ = cheerio.load(locals);
    const post = $('#posts-chart');
    const tag = $('#tags-chart');
    const category = $('#categories-chart');
    const htmlEncode = false;

    if (post.length > 0 || tag.length > 0 || category.length > 0) {
      if (post.length > 0 && $('#postsChart').length === 0) {
        if (post.attr('data-encode') === 'true') htmlEncode = true;
        post.after(postsChart(post.attr('data-start')));
      }
      if (tag.length > 0 && $('#tagsChart').length === 0) {
        if (tag.attr('data-encode') === 'true') htmlEncode = true;
        tag.after(tagsChart(tag.attr('data-length')));
      }
      if (category.length > 0 && $('#categoriesChart').length === 0) {
        if (category.attr('data-encode') === 'true') htmlEncode = true;
        category.after(
          categoriesChart(category.attr('data-parent'), category.attr('word'))
        );
      }

      if (htmlEncode) {
        return $.root()
          .html()
          .replace(/&amp;#/g, '&#');
      } else {
        return $.root().html();
      }
    } else {
      return locals;
    }
  },
  15
);

const util = require('hexo-util');
const stripHTML = util.stripHTML;

const counter = (content) => {
  content = stripHTML(content);
  const cn = (content.match(/[\u4E00-\u9FA5]/g) || []).length;
  const en = (
    content
      .replace(/[\u4E00-\u9FA5]/g, '')
      .match(
        /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g
      ) || []
  ).length;
  return [cn, en];
};

const wordcount = (content) => {
  var len = counter(content);
  var count = len[0] + len[1];
  return count;
};

const postsChart = (startMonth) => {
  const startDate = moment(startMonth || '2020-01');
  const endDate = moment();

  const monthMap = new Map();
  const wordMap = new Map();
  const dayTime = 3600 * 24 * 1000;
  for (let time = startDate; time <= endDate; time += dayTime) {
    const month = moment(time).format('YYYY-MM');
    if (!monthMap.has(month)) {
      monthMap.set(month, 0);
      wordMap.set(month, 0);
    }
  }
  hexo.locals.get('posts').forEach(function (post) {
    const month = post.date.format('YYYY-MM');
    if (monthMap.has(month)) {
      monthMap.set(month, monthMap.get(month) + 1);
      wordMap.set(month, wordMap.get(month) + wordcount(post.content));
    }
  });
  const monthArr = JSON.stringify([...monthMap.keys()]);
  const monthValueArr = JSON.stringify([...monthMap.values()]);
  const wordValueArr = JSON.stringify([...wordMap.values()]);

  return `
  <script id="postsChart">
    var postsChart = echarts.init(document.getElementById('posts-chart'), 'light');
    var postsOption = {
      title: {
        text: '文章发布统计图',
        x: 'center',
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        axisLabel: {
          show: true,
        },
        data: ${monthArr}
      },
      legend: {
        data: ['文章篇数', '字数'],
        x: 'right',
        y: 'top'
      },
      yAxis: [{
        name: '文章篇数',
        type: 'value',
        splitLine: {
          show: false
        },
      }, {
        name: '字数',
        type: 'value',
        interval: 15000,
        splitLine: {
          show: false
        },
      }],
      series: [{
        name: '文章篇数',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: ${monthValueArr},
        stack: 'Total',
      }, {
        name: '字数',
        type: 'line',
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        stack: 'Total',
        data: ${wordValueArr},
      }]
    };
    postsChart.setOption(postsOption);
    window.addEventListener('resize', () => { 
      postsChart.resize();
    });
    postsChart.on('click', 'series', (event) => {
      if (event.componentType === 'series') window.location.href = '/archives/' + event.name.replace('-', '/');
    });
  </script>`;
};

function tagsChart(len) {
  const tagArr = [];
  hexo.locals.get('tags').map(function (tag) {
    tagArr.push({ name: tag.name, value: tag.length, path: tag.path });
  });
  tagArr.sort((a, b) => {
    return b.value - a.value;
  });

  const dataLength = Math.min(tagArr.length, len) || tagArr.length;
  const tagNameArr = [];
  for (let i = 0; i < dataLength; i++) {
    tagNameArr.push(tagArr[i].name);
  }
  const tagNameArrJson = JSON.stringify(tagNameArr);
  const tagArrJson = JSON.stringify(tagArr);

  return `
  <script id="tagsChart">
    var color = document.documentElement.getAttribute('data-theme') === 'light' ? '#4c4948' : 'rgba(255,255,255,0.7)'
    var tagsChart = echarts.init(document.getElementById('tags-chart'), 'light');
    var tagsOption = {
      title: {
        text: 'Top ${dataLength} 标签统计图',
        x: 'center',
        textStyle: {
          color: color
        }
      },
      tooltip: {},
      xAxis: {
        name: '标签',
        type: 'category',
        nameTextStyle: {
          color: color
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: true,
          color: color,
          interval: 0
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: color
          }
        },
        data: ${tagNameArrJson}
      },
      yAxis: {
        name: '文章篇数',
        type: 'value',
        splitLine: {
          show: false
        },
        nameTextStyle: {
          color: color
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: true,
          color: color
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: color
          }
        }
      },
      series: [{
        name: '文章篇数',
        type: 'bar',
        data: ${tagArrJson},
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: 'rgba(128, 255, 165)'
          },
          {
            offset: 1,
            color: 'rgba(1, 191, 236)'
          }])
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
              offset: 0,
              color: 'rgba(128, 255, 195)'
            },
            {
              offset: 1,
              color: 'rgba(1, 211, 255)'
            }])
          }
        },
        markLine: {
          data: [{
            name: '平均值',
            type: 'average',
            label: {
              color: color
            }
          }]
        }
      }]
    };
    tagsChart.setOption(tagsOption);
    window.addEventListener('resize', () => { 
      tagsChart.resize();
    });
    tagsChart.on('click', 'series', (event) => {
      if(event.data.path) window.location.href = '/' + event.data.path;
    });
  </script>`;
}

function categoriesChart(dataParent, word = false) {
  const categoryArr = [];
  let categoryParentFlag = false;
  hexo.locals.get('categories').map(function (category) {
    if (category.parent) categoryParentFlag = true;
    categoryArr.push({
      name: category.name,
      value: word
        ? category.posts.reduce((pre, post) => pre + wordcount(post.content), 0)
        : category.length,
      path: category.path,
      id: category._id,
      parentId: category.parent || '0',
    });
  });
  categoryParentFlag = categoryParentFlag && dataParent === 'true';
  categoryArr.sort((a, b) => {
    return b.value - a.value;
  });
  function translateListToTree(data, parent) {
    let tree = [];
    let temp;
    data.forEach((item, index) => {
      if (data[index].parentId == parent) {
        let obj = data[index];
        temp = translateListToTree(data, data[index].id);
        if (temp.length > 0) {
          obj.children = temp;
        }
        if (tree.indexOf()) tree.push(obj);
      }
    });
    return tree;
  }
  const categoryNameJson = JSON.stringify(
    categoryArr.map(function (category) {
      return category.name;
    })
  );
  const categoryArrJson = JSON.stringify(categoryArr);
  const categoryArrParentJson = JSON.stringify(
    translateListToTree(categoryArr, '0')
  );

  return `
  <script id="categoriesChart">
    var color = document.documentElement.getAttribute('data-theme') === 'light' ? '#4c4948' : 'rgba(255,255,255,0.7)'
    var categoriesChart = echarts.init(document.getElementById('categories-chart'), 'light');
    var categoryParentFlag = ${categoryParentFlag}
    var categoriesOption = {
      title: {
        text: '文章分类${word ? '字数' : ''}统计图',
        x: 'center',
        textStyle: {
          color: color
        }
      },
      legend: {
        top: 'bottom',
        data: ${categoryNameJson},
        textStyle: {
          color: color
        }
      },
      tooltip: {
        trigger: 'item'
      },
      series: []
    };
    categoriesOption.series.push(
      categoryParentFlag ? 
      {
        nodeClick :false,
        name: '${word ? '文章总字数' : '文章篇数'}',
        type: 'sunburst',
        radius: ['15%', '90%'],
        center: ['50%', '55%'],
        sort: 'desc',
        data: ${categoryArrParentJson},
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          emphasis: {
            focus: 'ancestor',
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(255, 255, 255, 0.5)'
          }
        }
      }
      :
      {
        name: '${word ? '文章总字数' : '文章篇数'}',
        type: 'pie',
        radius: [30, 80],
        roseType: 'area',
        label: {
          color: color,
          formatter: '{b} : {c} ({d}%)'
        },
        data: ${categoryArrJson},
        itemStyle: {
          emphasis: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(255, 255, 255, 0.5)'
          }
        }
      }
    )
    categoriesChart.setOption(categoriesOption);
    window.addEventListener('resize', () => { 
      categoriesChart.resize();
    });
    categoriesChart.on('click', 'series', (event) => {
      if(event.data.path) window.location.href = '/' + event.data.path;
    });
  </script>`;
}
