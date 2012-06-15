var Colorpicker = function() {
    this.init();
};

Colorpicker.prototype = {
    init: function() {
        var getctx = function(id) {return document.getElementById(id).getContext('2d'); };
        var Color = chroma.Color;
        var config = {
            sq: 210,
            scale: 2,
            mode: 'lab',
            x: '',
            y: '',
            z: '',
            zval: 0.5,
            gradients: 6
        };

        var changeMode = function(mode) {
            config.mode = mode;
            var modeopt = colorspace[mode];
            var i;
            config.opt = modeopt;

            $('.axis-select a').remove();
            for (i = 0; i < modeopt.axis.length; i++) {
                var ax = modeopt.axis[i];
                var a = $('<li><a href="#" data-axis="' + ax + '">' + ax[0] + '/' + ax[1] + '</a></li>');
                $('.axis-select').append(a);
            }
            $('.axis-select a').click(changeAxisClick);
        };

        var changeAxisClick = function(e) {
            updateAxis($(e.target).data('axis'));
            return false;
        };

        var colorspace = {
            'hcl': {
                dimensions: [
                    ['h', 'hue', 0,360,0],
                    ['c', 'chroma', 0,5,1],
                    ['l', 'lightness', 0,1.7,0.6]],
                axis: ['hlc', 'clh', 'hcl']
            }
        };

        var getColor = function(x,y) {
            var xyz = [];
            var dx = config.dx;
            var dy = config.dy;
            var dz = config.dz;

            xyz[dx] = x;
            xyz[dy] = y;
            xyz[dz] = config.zval;

            return new Color(xyz, config.mode);
        };

        var bgimg;
        var renderColorSpace = function() {
            var x, y, xv, color, idx, xyz,
                dx = config.dx,
                dy = config.dy,
                i, dim,
                xdim = config.xdim,
                ydim=config.ydim,
                sq = config.sq,
                ctx = getctx('colorspace'),
                imdata = ctx.createImageData(sq,sq);

            for (x=0; x<sq; x++) {
                for (y=0; y<sq; y++) {

                    idx = (x+y*imdata.width)*4;
                    xv = xdim[2] + (x/sq)*(xdim[3]-xdim[2]);
                    yv = ydim[2] + (y/sq)*(ydim[3]-ydim[2]);

                    color = getColor(xv, yv).rgb;

                    if (isNaN(color[0])) {
                        imdata.data[idx] = 255;
                        imdata.data[idx+1] = 0;
                        imdata.data[idx+2] = 0;
                        imdata.data[idx+3] = 0;
                    } else {
                        imdata.data[idx] = color[0];
                        imdata.data[idx+1] = color[1];
                        imdata.data[idx+2] = color[2];
                        imdata.data[idx+3] = 255;
                    }
                }
            }
            ctx.putImageData(imdata, 0,0);
            if (config.gradients) showGradient();
        };

        var updateAxis = function(axis) {

            config.x = axis[0];
            config.y = axis[1];
            config.z = axis[2];

            $('.axis-select a').removeClass('sel');
            $('.axis-select').find('[data-axis="' + axis + '"]').addClass('sel');
            var i;

            for (i = 0; i < config.opt.dimensions.length; i++) {
                var dim = config.opt.dimensions[i];
                if (dim[0] === config.x) {
                    config.dx = i;
                    config.xdim = dim;
                } else if (dim[0] === config.y) {
                    config.dy = i;
                    config.ydim = dim;
                } else if (dim[0] === config.z) {
                    config.dz = i;
                    config.zdim = dim;
                }
            }
            $('#sl-z').slider({
                min: config.zdim[2],
                max: config.zdim[3],
                step: config.zdim[3] > 99 ? 1 : 0.01,
                value: config.zdim[4]
            });
            config.zval = config.zdim[4];
            $('label[for=val-z]').html(config.zdim[1]);
            renderColorSpace();

            if (config.gradients) resetGradient();
                $('#sl-val').html($('#sl-z').slider('value') + ' ' + axis[2]);
            };

            var setView = function(mode, axis) {
                changeMode(mode);
                updateAxis(axis);
            };

            var updateSlideValPos = function() {
                $('#sl-val').css({top: ($('#sl-z .ui-slider-handle').position().top+7) + 'px' });
            };

            window.setView = setView;

            $('#sl-z').slider({
                orientation: 'vertical',
                range: 'min',
                step: 0.01,
                value: 0.5,
                slide: function( event, ui ) {
                    $('#sl-val').html(ui.value + ' ' + axis[2]);
                    config.zval = ui.value;
                    renderColorSpace();
                }
            });

            $('#sl-z .ui-slider-handle').append('<div id="sl-val" />');

            var swatches = 6;
            if (config.gradients) {
                var gradient = {
                from: [0,1], //x,y
                to: [1,0.5], //x,y
                steps: swatches,
                handlesize: 10
            };

            $('#controls a').click(function () {
                var operation = $(this).attr('data-type');
                if (operation == 'add') {
                    swatches = swatches + 1;
                    gradient.steps = swatches;
                    showGradient();
                }
                if (operation == 'subtract') {
                    if (swatches != 1) {
                    swatches = swatches - 1;
                    gradient.steps = swatches;
                    showGradient();
                    }
                }
                return false;
            });

            var resetGradient = function() {
                gradient.from[0] = config.xdim[2] + (config.xdim[3]-config.xdim[2]) * (23/36);
                gradient.from[1] = config.ydim[2] + (config.ydim[3]-config.ydim[2]) * 0.1;
                gradient.to[0] = config.xdim[2] + (config.xdim[3]-config.xdim[2]) * (8/36);
                gradient.to[1] = config.ydim[2] + (config.ydim[3]-config.ydim[2]) * 0.8;
                showGradient();
            };

            var showGradient = function() {
                // draw line
                var colors = [], col_f, col_t, col,
                toX = function(v, dim) {
                    return Math.round((v - dim[2])/(dim[3]-dim[2])*config.sq*config.scale)-0.5;
                },
                a = gradient.handlesize, b = Math.floor(gradient.handlesize*0.65), i, fx, fy, x, y,

                x0 = toX(gradient.from[0], config.xdim)+10,
                x1 = toX(gradient.to[0], config.xdim)+10,
                y0 = toX(gradient.from[1], config.ydim)+10,
                y1 = toX(gradient.to[1], config.ydim)+10,
                ctx = getctx('grad');
                ctx.clearRect(0,0,600,600);

                $('.drag.from').css({ width: (a*2) + 'px', height: (a*2) + 'px', left: (x0-a) + 'px', top: (y0-a) + 'px' });
                $('.drag.to').css({ width: (a*2) + 'px', height: (a*2)+'px', left: (x1-a) + 'px', top: (y1-a) + 'px' });

                ctx.beginPath();
                ctx.strokeStyle='rgba(255,255,255,.75)';
                ctx.moveTo(x0,y0);
                ctx.lineTo(x1,y1);
                ctx.stroke();

                ctx.beginPath();
                ctx.strokeStyle='#fff';
                col_f = getColor(gradient.from[0],gradient.from[1]).hex();
                ctx.fillStyle = col_f;
                ctx.rect(x0-a,y0-a,a*2,a*2);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                col_t = getColor(gradient.to[0],gradient.to[1]).hex();
                ctx.fillStyle= col_t;
                ctx.rect(x1-a,y1-a,a*2,a*2);
                ctx.fill();
                ctx.stroke();

                colors.push(col_f);

                for (i = 1; i < gradient.steps-1; i++) {
                    fx = gradient.from[0] + (i/(gradient.steps-1)) * (gradient.to[0]-gradient.from[0]);
                    fy = gradient.from[1] + (i/(gradient.steps-1)) * (gradient.to[1]-gradient.from[1]);
                    x = toX(fx, config.xdim) + 10;
                    y = toX(fy, config.ydim) + 10;

                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(255,255,255,.5)';
                    col = getColor(fx,fy).hex();
                    colors.push(col);
                    ctx.fillStyle = col;
                    ctx.rect(x-b,y-b,b*2,b*2);
                    ctx.fill();
                    ctx.stroke();
                }
                colors.push(col_t);

                $('#visual-output .swatch').remove();
                $('#code-output').empty();

                var textarea = $('#code-output');
                for (i = 0; i < colors.length; i++) {
                    // Color Swatches
                    var swatch = $('<div class="swatch" />');
                    swatch.css({ background: colors[i] });
                    $('#visual-output').append(swatch);

                    // Code Snippet
                    textarea.append(colors[i] + '\n');
                }
                textarea.on('click', function() {
                    $(this).select();
                    return false;
                });
            };

            $('.drag').draggable({
                containment: 'parent',
                drag: function(event, ui) {
                    var from = $(event.target).hasClass('from'),
                    x = ui.position.left + gradient.handlesize-10,
                    y = ui.position.top + gradient.handlesize-10,
                    xv = x / (config.sq*config.scale) * (config.xdim[3]-config.xdim[2]) + config.xdim[2],
                    yv = y / (config.sq*config.scale) * (config.ydim[3]-config.ydim[2]) + config.ydim[2];

                    xv = Math.min(config.xdim[3], Math.max(config.xdim[2], xv));
                    yv = Math.min(config.ydim[3], Math.max(config.ydim[2], yv));

                    from ? gradient.from = [xv,yv] : gradient.to = [xv,yv];
                    showGradient();
                }
            });
        }

        var mode = 'hcl',
        axis = colorspace[mode].axis[0];

        setView(mode, axis);
        if (config.gradients) showGradient();
    }
};