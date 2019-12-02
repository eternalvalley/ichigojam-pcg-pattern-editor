const domain = 'eternalvalley.github.io';
const path = '/ichigojam-pcg-editor/';

$(document).ready(function() {
  const canvasDiv = $('#canvas');
  const canvasWidthInput = $('#canvas-width');
  const canvasHeightInput = $('#canvas-height');
  const pixelSizeInput = $('#pixel-size');
  const bitmapShiftCyclicInput = $('#bitmap-shift-cyclic');
  const resultsDiv = $('#results');
  const portTextarea = $('#port-textarea');
  const message = '失われる情報がありますがよろしいですか？';
  var canvas;

  defineCanvas();
  generate();

  $('input[type="number"]').keypress(function(e) {
    const c = e.charCode;
    return (c >= 48 && c <= 57) || c === 8 || c === 13;
  });

  $('input[type="number"]').change(function(e) {
    const max = parseInt(this.max);
    const min = parseInt(this.min);
    const val = parseInt(this.value);
    if (max < val) {
      this.value = max;
    } else if (min > val) {
      this.value = min;
    }
  });

  /**
   * return true if lost edited data by changing canvas size
   */
  function mayLostData() {
    const currentWidth = getCurrentCanvasWidth();
    const currentHeight = getCurrentCanvasHeight();
    const newWidth = canvasWidthInput.val();
    const newHeight = canvasHeightInput.val();

    if(newWidth >= currentWidth
      && newHeight >= currentHeight) {
      return false;
    }

    if (newHeight < currentHeight
      && canvas
        .slice(newHeight << 3)
        .map(e => e.includes(true))
        .includes(true)) {
        return true;
    }

    return newWidth < currentWidth
      && canvas
        .map(e => e.includes(true, newWidth << 3))
        .includes(true);
  }

  $('#change-canvas-size').click(function(e) {
    if (mayLostData() && !confirm(message)) {
      return;
    }
    defineCanvas();
    generate();
  });

  function hasData() {
    return canvasDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .children('td.on')
      .length > 0;
  }

  function applyPixelSize() {
    canvasDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .children('td')
      .css('padding', (pixelSizeInput.val() / 2) + 'px');
  }

  pixelSizeInput.change(function(e) {
    applyPixelSize();
  });

  function isNotCycric() {
    return !bitmapShiftCyclicInput.prop('checked');
  }

  $('#bitmap-shift-up').click(function(e) {
    canvas.push(canvas.shift());
    if (isNotCycric()) {
      canvas[canvas.length - 1].fill(false);
    }
    draw();
  });

  $('#bitmap-shift-down').click(function(e) {
    canvas.unshift(canvas.pop());
    if (isNotCycric()) {
      canvas[0].fill(false);
    }
    draw();
  });

  $('#bitmap-shift-left').click(function(e) {
    canvas.forEach(function(row) {
      row.push(row.shift());
      if (isNotCycric()) {
        row[row.length - 1] = false;
      }
    });
    draw();
  });

  $('#bitmap-shift-right').click(function(e) {
    canvas.forEach(function(row) {
      row.unshift(row.pop());
      if (isNotCycric()) {
        row[0] = false;
      }
    });
    draw();
  });

  $('#bitmap-revert').click(function(e) {
    canvas.forEach(function(row) {
      for (var i = 0; i < row.length; i++) {
        row[i] = !row[i];
      }
    });
    canvasDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .children('td')
      .toggleClass('on');
    resultsDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .children('td')
      .children('span')
      .each(function(e) {
        this.textContent = 255 - this.textContent;
      });
  });

  $('#bitmap-clear').click(function(e) {
    if (hasData() && !confirm(message)) {
      return;
    }
    canvas.forEach(e => e.fill(false));
    canvasDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .children('td.on')
      .removeClass('on');
    resultsDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .children('td')
      .children('span')
      .text(0);
  });

  $('#export').click(function(e) {
    portTextarea
      .prop('cols', Math.floor((getCurrentCanvasWidth() << 3) * 16 / 13))
      .prop('rows', Math.floor(getCurrentCanvasHeight() << 3))
      .val(canvas
        .map(e => e.map(b => b ? '1' : '0')
          .reduce((a, c) => a.concat(c)))
        .join('\n'));
  });

  $('#import').click(function(e) {
    if (hasData() && !confirm(message)) {
      return;
    }
    const lines = portTextarea.val().trim().split(/ *\n/);
    const lengthMax = lines
      .map(e => e.length)
      .reduce((a, c) => Math.max(a, c));

    // construct two dimentions array
    const xEnd = (((lengthMax - 1) >> 3) + 1) << 3;
    const yEnd = (((lines.length  - 1) >> 3) + 1) << 3;
    canvasWidthInput.val(xEnd >> 3);
    canvasHeightInput.val(yEnd >> 3);
    canvas.length = yEnd;
    for (var y = 0; y < yEnd; y++) {
       canvas[y] = new Array(xEnd);
      for(var x = 0; x < xEnd; x++) {
        var bool;
        if (y >= lines.length || x >= lines[y].length) {
          bool = false;
        } else {
          bool = lines[y].charAt(x) === '1';
        }
        canvas[y][x] = bool;
      }
    }
    generate();
  });

  function getCurrentCanvasWidth() {
    return Math.ceil(canvas
      .map(e => e.length)
      .reduce((a, c) => Math.max(a, c)) >> 3);
  }

  function getCurrentCanvasHeight() {
    return Math.ceil(canvas.length >> 3);
  }

  function defineCanvas() {
    const newWidth = canvasWidthInput.val();
    const newHeight = canvasHeightInput.val();

    if (canvas === undefined) {
      // generate canvas
      const yEnd = newHeight << 3;
      canvas = new Array(yEnd);
      for (var y = 0; y < yEnd; y++) {
        canvas[y] = new Array(newWidth << 3).fill(false);
      }
    } else {
      const currentWidth = getCurrentCanvasWidth();
      const currentHeight = getCurrentCanvasHeight();
      if (newHeight > currentHeight) {
        // increase canvas height
        const yEnd = newHeight << 3;
        for (var y = canvas.length; y < yEnd; y++) {
          canvas[y] = new Array(newWidth << 3).fill(false);
        }
      } else if (newHeight < currentHeight) {
        // decrease canvas height
        canvas = canvas.slice(0, newHeight << 3);
      }
      if (newWidth > currentWidth) {
        // increase canvas width
        const xStart = currentWidth << 3;
        const xEnd =  newWidth << 3;
        canvas.forEach(function(row) {
          row.length = xEnd;
          row.fill(false, xStart)
        });
      } else if (newWidth < currentWidth) {
        // decrease canvas width
        const xEnd = newWidth << 3;
        canvas.forEach(function(row) {
          row.length = xEnd;
        });
      }
    }
  }

  function generate() {
    generateCanvas();
    generateResults();
  }

  function draw() {
    drawCanvas();
    drawResults();
  }

  function getCanvasWidthPixel(pixelSize) {
    return (pixelSize + 1) * getCurrentCanvasWidth() * 8 + 3;
  }

  function getCanvasWidthPixelMax() {
    return Math.ceil(window.innerWidth * 0.95);
  }

  function getCanvasHeightPixel(pixelSize) {
    return (pixelSize + 1) * getCurrentCanvasHeight() * 8 + 3;
  }

  function getCanvasHeightPixelMax() {
    return Math.ceil(window.innerHeight * 0.75);
  }

  function generateCanvas() {
    // clear
    canvasDiv.empty();

    // generate DOM
    const yEnd = canvasHeightInput.val() << 3;
    const xEnd = canvasWidthInput.val() << 3;
    const tbody = $('<tbody>');
    for (var y = 0; y < yEnd; y++) {
      var tr = $('<tr>');
      for (var x = 0; x < xEnd; x++) {
        var td = $('<td>').data('x', x).data('y', y);
        if(canvas[y][x]) {
          td.addClass('on');
        }
        tr.append(td);
      }
      tbody.append(tr);
    }
    canvasDiv.append($('<table>').append(tbody));

    // apply style
    var pixelSize = parseInt(pixelSizeInput.val());
    while (pixelSize > 5
      && (getCanvasWidthPixel(pixelSize) > getCanvasWidthPixelMax()
      || getCanvasHeightPixel(pixelSize) > getCanvasHeightPixelMax())) {
      pixelSize -= 5;
    }
    pixelSizeInput.val(pixelSize);
    applyPixelSize();

    // set event
    $('#canvas td').click(function(e) {
      const td = $(this);
      const x = td.data('x');
      const y = td.data('y');
      canvas[y][x] = !canvas[y][x];
      td.toggleClass('on');

      // calculate result value
      const xStart = (x >> 3) << 3;
      var value = 0;
      for (var i = 0; i < 8; i++) {
        value += (canvas[y][xStart + i] ? 1 : 0) << (7 - i);
      }

      // print result
      resultsDiv
        .children('table')
        .children('tbody')
        .children('tr:nth-of-type(' + ((y >> 3) + 1) + ')')
        .children('td:nth-of-type(' + ((x >> 3) + 1) + ')')
        .children('span:nth-of-type(' + ((y & 7) + 1) + ')')
        .text(value);
    });
  }

  function drawCanvas() {
    canvasDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .each(function(y) {
        $(this)
          .children('td')
          .each(function(x) {
          if (canvas[y][x]) {
            this.className = 'on';
          } else {
            this.className = null;
          }
        });
    });
  }

  function generateResults() {
    // clear
    resultsDiv.empty();

    // generate DOM
    const widthEnd = canvasWidthInput.val();
    const heightEnd = canvasHeightInput.val();
    const tbody = $('<tbody>');
    for (var height = 0; height < heightEnd; height++) {
      var yStart = height << 3;
      var tr = $('<tr>');
      for (var width = 0; width < widthEnd; width++) {
        var xStart = width << 3;
        var td = $('<td>');
        for (var y = 0; y < 8; y++) {
          var value = 0;
          for (var x = 0; x < 8; x++) {
            if (canvas[yStart + y][xStart + x]) {
              value += 1 << (7 - x);
            }
          }
          td.append($('<span>').text(value));
          if (y != 7) {
            td.append(',');
          }
          tr.append(td);
        }
        tbody.append(tr);
      }
    }
    resultsDiv.append($('<table>').append(tbody));
  }

  function drawResults() {
    resultsDiv
      .children('table')
      .children('tbody')
      .children('tr')
      .each(function(height) {
        var yStart = height << 3;
        $(this)
          .children('td')
          .each(function(width) {
          var xStart = width << 3;
          $(this)
            .children('span')
            .each(function(y) {
            var value = 0;
            for (var x = 0; x < 8; x++) {
              if (canvas[yStart + y][xStart + x]) {
                value += 1 << (7 - x);
              }
            }
            this.textContent = value;
          });
        });
    });
  }

});

