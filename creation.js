

var gl; // the graphics context (gc) 
var shaderProgram; // the shader program 

//viewport info 
var vp_minX, vp_maxX, vp_minY, vp_maxY, vp_width, vp_height;

var VertexColorBuffer;

var PointVertexPositionBuffer;
var LineVertexPositionBuffer;
var TriangleVertexPositionBuffer;
var SquareVertexPositionBuffer;

var shape_size = 0; // shape size counter 

var colors = [];
var shapes = []; // the array to store what shapes are in the list

var index;
var clicked = false;

var shapes_tx = []; // x translation  
var shapes_ty = []; // y translation 
var shapes_rotation = []; // rotation angle 
var shapes_scale = []; // scaling factor (uniform is assumed)  

var polygon_mode = 'h'; //default = h line 
var color_mode = 'r';

var clear = false;
var redisplay = false;

var global_mode = false;
var global_rotation = 0.0;
var global_scale = 1.0;



//////////// Init OpenGL Context etc. ///////////////

function initGL(canvas) {
    try {
        gl = canvas.getContext("experimental-webgl");
        gl.canvasWidth = canvas.width;
        gl.canvasHeight = canvas.height;
    } catch (e) {}
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

///////////////////////////////////////////////////////////////

function webGLStart() {
    var canvas = document.getElementById("lab2-canvas");
    initGL(canvas);
    initShaders();
    ////////
    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    ////////
    shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    initScene();

    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('keydown', onKeyDown, false);
}


//////////////////////////////////////////////////////////////////
///////               Create each VBO          /////////////////
function CreateBuffer() {
    //point
    var point_vertices = [0.0, 0.0, 0.0];
    PointVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, PointVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(point_vertices), gl.STATIC_DRAW);
    PointVertexPositionBuffer.itemSize = 3; // NDC'S [x,y,0] 
    PointVertexPositionBuffer.numItems = 1;

    //line
    var line_vertices = [ // A VBO for horizontal line in a standard position. To be translated to position of mouse click 
        -0.1, 0.0, 0.0,
        0.1, 0.0, 0.0
    ];
    LineVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, LineVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line_vertices), gl.STATIC_DRAW);
    LineVertexPositionBuffer.itemSize = 3; // NDC'S [x,y,0] 
    LineVertexPositionBuffer.numItems = 2; // this buffer only contains A line, so only two vertices 

    //triangle
    var tri_vertices = [
        -0.05, -0.05, 0.0,
        0.05, -0.05, 0.0,
        0.0, 0.05, 0.0
    ]
    TriangleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, TriangleVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tri_vertices), gl.STATIC_DRAW);
    TriangleVertexPositionBuffer.itemSize = 3;
    TriangleVertexPositionBuffer.numItems = 3;

    //square
    var squ_vertices = [
        -0.05, 0.05, 0.0,
        -0.05, -0.05, 0.0,
        0.05, -0.05, 0.0,
        -0.05, 0.05, 0.0,
        0.05, 0.05, 0.0,
        0.05, -0.05, 0.0,
    ]
    SquareVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, SquareVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(squ_vertices), gl.STATIC_DRAW);
    SquareVertexPositionBuffer.itemSize = 3;
    SquareVertexPositionBuffer.numItems = 6;

}

///////////////////////////////////////////////////////

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}


///////////////////////////////////////////////////////
var mvMatrix = mat4.create(); // this is the matrix for transforming each shape before draw 

function draw_geo(buffer, type) {
    var buffer;
    var type;

    for (var i = 0; i < shape_size; i++) { // draw the line vbo buffer multiple times, one with a new transformation specified by mouse click 

        switch (shapes[i]) {
            case 'p':
                buffer = PointVertexPositionBuffer;
                type = gl.POINTS;
                break;
            case 'h':
                buffer = LineVertexPositionBuffer;
                type = gl.LINES;
                break;
            case 'v':
                buffer = LineVertexPositionBuffer;
                type = gl.LINES;
                break;
            case 't':
                buffer = TriangleVertexPositionBuffer;
                type = gl.TRIANGLES;
                break;
            case 'q':
                buffer = SquareVertexPositionBuffer;
                type = gl.TRIANGLES;
                break;
        }


        var color = [];
        var singlecolor = [];
        switch (colors[i]) {
            case 'r':
                singlecolor = [1.0, 0.0, 0.0, 1.0, ]
                break;
            case 'g':
                singlecolor = [0.0, 1.0, 0.0, 1.0, ]
                break;
            case 'b':
                singlecolor = [0.0, 0.0, 1.0, 1.0, ]
                break;
        }
        for (var j = 0; j < buffer.numItems; j++) {
            color = color.concat(singlecolor);
        }

        //color buffer
        VertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
        VertexColorBuffer.itemSize = 4;
        VertexColorBuffer.numItems = buffer.numItems;


        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); // make the point current buffer 
        gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, buffer.itemSize, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, VertexColorBuffer);
        gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, VertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

        mat4.identity(mvMatrix);
        var trans = [0, 0, 0];
        trans[0] = shapes_tx[i];
        trans[1] = shapes_ty[i];
        trans[2] = 0.0;

        var scale = [1, 1, 1];
        scale[0] = scale[1] = scale[2] = shapes_scale[i];

        var gScale = [1, 1, 1];
        gScale[0] = gScale[1] = gScale[2] = global_scale;

        var theta = degToRad(shapes_rotation[i]);
        var theta_global = degToRad(global_rotation);

        vmMatrix = mat4.scale(mvMatrix, gScale);
        mvMatrix = mat4.rotate(mvMatrix, theta_global, [0, 0, 1]);

        mvMatrix = mat4.translate(mvMatrix, trans);
        mvMatrix = mat4.rotate(mvMatrix, theta, [0, 0, 1]);
        mvMatrix = mat4.scale(mvMatrix, scale);

        setMatrixUniforms(); // pass the matrix to the vertex shader 
        gl.drawArrays(type, 0, buffer.numItems);
    }
}

///////////////////////////////////////////////////////////////////////

function initScene() {
    vp_minX = 0;
    vp_maxX = gl.canvasWidth;
    vp_width = vp_maxX - vp_minX + 1;
    vp_minY = 0;
    vp_maxY = gl.canvasHeight;
    vp_height = vp_maxY - vp_minY + 1;
    console.log(vp_minX, vp_maxX, vp_minY, vp_maxY);
    gl.viewport(vp_minX, vp_minY, vp_width, vp_height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    CreateBuffer();
}

///////////////////////////////////////////////////////////////////////
function drawScene() {
    vp_minX = 0;
    vp_maxX = gl.canvasWidth;
    vp_width = vp_maxX - vp_minX + 1;
    vp_minY = 0;
    vp_maxY = gl.canvasHeight;
    vp_height = vp_maxY - vp_minY + 1;
    console.log(vp_minX, vp_maxX, vp_minY, vp_maxY);
    gl.viewport(vp_minX, vp_minY, vp_width, vp_height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    draw_geo();
}


///////////////////////////////////////////////////////////////
//   Below are mouse and key event handlers 
//

var Z_angle = 0.0;
if (polygon_mode == 'v') {
    Z_angle = 90.0;
}
var lastMouseX = 0,
    lastMouseY = 0;



///////////////////////////////////////////////////////////////

function clickDetection(x, y) {
    var onClick = false;

    for (var i = 0; i < shape_size; i++) {
        var xc = shapes_tx[i];
        var yc = shapes_ty[i];
        var distance = Math.sqrt((x - xc) * (x - xc) + (y - yc) * (y - yc));;
        var scal = shapes_scale[i];

        console.log("dis", distance);

        if (distance <= 0.08 * scal) {
            onClick = true;
            index = i;
            return onClick;
        }

    }

    return onClick;
}

///////////////////////////////////////////////////////////////

function onDocumentMouseDown(event) {
    event.preventDefault();
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);
    document.addEventListener('mouseout', onDocumentMouseOut, false);

    var mouseX = event.clientX;
    var mouseY = event.clientY;

    lastMouseX = mouseX;
    lastMouseY = mouseY;


    var NDC_X = (event.clientX - vp_minX) / vp_width * 2 - 1;
    var NDC_Y = ((vp_height - event.clientY) - vp_minY) / vp_height * 2 - 1;
    console.log("NDC click", event.clientX, event.clientY, NDC_X, NDC_Y);

    clicked = clickDetection(NDC_X, NDC_Y);
    console.log("clicked", clicked, " index: ", index);

    if (!global_mode && !clicked) {

        shapes.push(polygon_mode);
        colors.push(color_mode);
        shapes_tx.push(NDC_X);
        shapes_ty.push(NDC_Y);
        if (polygon_mode == 'v') {
            shapes_rotation.push(90.0);
            Z_angle = 90.0;
        } else {
            shapes_rotation.push(0.0);
            Z_angle = 0.0;
        }
        shapes_scale.push(1.0);


        shape_size++;
    }

    console.log("size=", shape_size);
    console.log("shape = ", polygon_mode);
    console.log("global_mode = ", global_mode);

    drawScene(); // draw the VBO 
}


////////////////////////////////////////////////////////////////////////////////////
//
//   Mouse button handlers 
//
function onDocumentMouseMove(event) { //update the rotation angle 

    var mouseX = event.clientX;
    var mouseY = event.ClientY;


    var diffX = mouseX - lastMouseX;
    var diffY = mouseY - lastMouseY;


    Z_angle = Z_angle + diffX / 5;

    lastMouseX = mouseX;
    lastMouseY = mouseY;


    if (global_mode) {
        global_rotation = Z_angle;

    } else if (clicked) {
        shapes_rotation[index] = Z_angle;
    } else {
        shapes_rotation[shape_size - 1] = Z_angle; // update the rotation angle
    }

    drawScene(); // draw the VBO 
}

function onDocumentMouseUp(event) {
    document.removeEventListener('mousemove', onDocumentMouseMove, false);
    document.removeEventListener('mouseup', onDocumentMouseUp, false);
    document.removeEventListener('mouseout', onDocumentMouseOut, false);
}

function onDocumentMouseOut(event) {
    document.removeEventListener('mousemove', onDocumentMouseMove, false);
    document.removeEventListener('mouseup', onDocumentMouseUp, false);
    document.removeEventListener('mouseout', onDocumentMouseOut, false);
}


///////////////////////////////////////////////////////////////////////////
//
//  key stroke handler 
//
function onKeyDown(event) {
    console.log(event.keyCode);
    switch (event.keyCode) {
        //shape
        case 80:
            if (event.shiftKey) {
                console.log('enter P');
                polygon_mode = 'p'
            } else {
                console.log('enter p');
                polygon_mode = 'p'
            }
            break;
        case 72:
            if (event.shiftKey) {
                console.log('enter H');
                polygon_mode = 'h'
            } else {
                console.log('enter h');
                polygon_mode = 'h'
            }
            break;
        case 86:
            if (event.shiftKey) {
                console.log('enter V');
                polygon_mode = 'v'
            } else {
                console.log('enter v');
                polygon_mode = 'v'
            }
            break;
        case 84:
            if (event.shiftKey) {
                console.log('enter T');
                polygon_mode = 't'
            } else {
                console.log('enter t');
                polygon_mode = 't'
            }
            break;
        case 81:
            if (event.shiftKey) {
                console.log('enter Q');
                polygon_mode = 'q'
            } else {
                console.log('enter q');
                polygon_mode = 'q'
            }
            break;
        case 79:
            if (event.shiftKey) {
                console.log('enter O');
                polygon_mode = 'o'
            } else {
                console.log('enter o');
                polygon_mode = 'o'
            }
            break;

            //color
        case 82:
            if (event.shiftKey) {
                console.log('enter R');
            } else {
                console.log('enter r');
            }

            if (clicked) {
                colors[index] = 'r';
            } else {
                color_mode = 'r';
            }

            break;
        case 71:
            if (event.shiftKey) {
                console.log('enter G');
            } else {
                console.log('enter g');
            }

            if (clicked) {
                colors[index] = 'g';
            } else {
                color_mode = 'g';
            }

            break;
        case 66:
            if (event.shiftKey) {
                console.log('enter B');
            } else {
                console.log('enter b');
            }

            if (clicked) {
                colors[index] = 'b';
            } else {
                color_mode = 'b';
            }

            break;

            //scale
        case 83:
            var scale_size = 1.0;
            if (event.getModifierState("CapsLock")) {
                console.log('enter S');
                scale_size = 1.1;
            } else {
                console.log('enter s');
                scale_size = 0.9;
            }
            if (global_mode) {
                global_scale *= scale_size;
            } else {
                if (clicked) {
                    shapes_scale[index] *= scale_size;
                } else {
                    shapes_scale[shape_size - 1] *= scale_size;
                }
            }
            break;

            //global transformation
        case 87:

            if (event.getModifierState("CapsLock")) {
                console.log('enter W');
                global_mode = true;
            } else {
                console.log('enter w');
                global_mode = false;
            }
            break;

            //redraw and clear
        case 68:
            if (event.shiftKey) {
                console.log('enter D');
                redisplay = true;
            } else {
                console.log('enter d');
                redisplay = true;
            }
            break;
        case 67:
            if (event.shiftKey) {
                console.log('enter C');
                clear = true;
            } else {
                console.log('enter c');
                clear = true;
            }
            break;
    }

    console.log('polygon mode =', polygon_mode);
    console.log('color mode =', color_mode);

    if (clear) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        colors = [];
        shapes = []; // the array to store what shapes are in the list
        shapes_tx = []; // x translation  
        shapes_ty = []; // y translation 
        shapes_rotation = []; // rotation angle 
        shapes_scale = []; // scaling factor (uniform is assumed)  

        shape_size = 0;
        gl.clearColor(0, 0, 0, 1);
        clear = false;
    }

    if (redisplay) {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        redisplay = false;
        console.log("Redisplayed!");
        drawScene();
    } else {
        drawScene();
    }

}
