window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };

})();

window.onload = function () {
    const WINDOW = {
        LEFT: -10,
        BOTTOM: -10,
        WIDTH: 20,
        HEIGHT: 20,
        P1: new Point(-10, 10, -30), // левый верхний угол
        P2: new Point(-10, -10, -30), // левый нижний угол
        P3: new Point(10, -10, -30), // правый нижний угол
        CENTER: new Point(0, 0, -30), // центр окошка, через которое видим мир -30
        CAMERA: new Point(0, 0, -50) // точка, из которой смотрим на мир 
    };
    const ZOOM_OUT = 1.1;
    const ZOOM_IN = 0.9;

    const sur = new Surfaces;
    const canvas = new Canvas({ id: 'canvas', width: 800, height: 800, WINDOW, callbacks: { wheel, mousemove, mouseup, mousedown, mouseleave } });
    const graph3D = new Graph3D({ WINDOW });
    const ui = new UI({ canvas, callbacks: { move, printPoints, printEdges, printPolygons, printFigures } })
    const SCENE = [sur.sphera()]; // сцена
    const LIGHT = new Light(-20, 2, -20, 200);

    let canRotate = false;
    let canPrint = {
        points: false,
        edges: false,
        polygons: true
    }

    // about callbacks
    function wheel(event) {
        const delta = (event.wheelDelta > 0) ? ZOOM_IN : ZOOM_OUT;
        graph3D.zoomMatrix(delta);
        SCENE.forEach(subject => {
            subject.points.forEach(point => graph3D.transform(point));
            if (subject.animation) {
                for (let key in subject.animation) {
                    graph3D.transform(subject.animation[key]);
                }

            }
        });
    }

    function mouseup() {
        canRotate = false;
    }

    function mouseleave() {
        mouseup();
    }

    function mousedown() {
        canRotate = true;
    }

    function mousemove(event) {

        if (canRotate) {
            if (event.movementX) {// крутить вокруг OY
                const alpha = canvas.sx(event.movementX) / 10;
                graph3D.rotateOxMatrix(alpha);
                graph3D.transform(WINDOW.CAMERA);
                graph3D.transform(WINDOW.CENTER);
                graph3D.transform(WINDOW.P1);
                graph3D.transform(WINDOW.P2);
                graph3D.transform(WINDOW.P3);

            }
            if (event.movementY) {// крутить вокруг OX
                const alpha = canvas.sy(event.movementY) / 10;
                graph3D.rotateOyMatrix(alpha);
                graph3D.transform(WINDOW.CAMERA);
                graph3D.transform(WINDOW.CENTER);
                graph3D.transform(WINDOW.P1);
                graph3D.transform(WINDOW.P2);
                graph3D.transform(WINDOW.P3);
            }

        };
    };

    function printFigures(value) {
        while (SCENE.length !== 0) {
            SCENE.pop();
        }
        switch (value) {
            case "sphera":
                SCENE.push(sur.sphera());
                break;
			case "parabolyccylinder":
                SCENE.push(sur.parabolyccylinder());
                break;
        }
    }

    function printPoints(value) {
        canPrint.points = value;
    };

    function printEdges(value) {
        canPrint.edges = value;
    }

    function printPolygons(value) {
        canPrint.polygons = value;

    };


    function move(direction) {
        switch (direction) {
            case 'up': graph3D.rotateOxMatrix(-Math.PI / 180); break;
            case 'down': graph3D.rotateOxMatrix(Math.PI / 180); break;
            case 'left': graph3D.rotateOyMatrix(-Math.PI / 180); break;
            case 'right': graph3D.rotateOyMatrix(Math.PI / 180); break;
        }
        graph3D.transform(WINDOW.CAMERA);
        graph3D.transform(WINDOW.CENTER);
        graph3D.transform(WINDOW.P1);
        graph3D.transform(WINDOW.P2);
        graph3D.transform(WINDOW.P3);
    }


    function printAllPolygons() {
        // print polygons
        if (canPrint.polygons) {
            // набрать полигоны в кучу
            const polygons = [];
            // предварительные расчеты
            SCENE.forEach(subject => {
                // алгоритм художника
                graph3D.calcDistance(subject, WINDOW.CAMERA, 'distance'); // записать дистанции
                graph3D.calcCenters(subject); // найти центры всех полигонов
                graph3D.calcDistance(subject, LIGHT, 'lumen');
            });
            // расчет освещенности полигонов и его проекции на экран
            SCENE.forEach(subject => {
                // отрисовка полигонов
                for (let i = 0; i < subject.polygons.length; i++) {
                    //отрисовка полигонов
                    if (subject.polygons[i].visible) {
                        const polygon = subject.polygons[i];
                        const point1 = graph3D.getProection(subject.points[polygon.points[0]]);
                        const point2 = graph3D.getProection(subject.points[polygon.points[1]]);
                        const point3 = graph3D.getProection(subject.points[polygon.points[2]]);
                        const point4 = graph3D.getProection(subject.points[polygon.points[3]]);
                        let { r, g, b } = polygon.color;
                        const { isShadow, dark } = graph3D.calcShadow(polygon, subject, SCENE, LIGHT);
                        const lumen = (isShadow) ? dark : graph3D.calcIllumination(polygon.lumen, LIGHT.lumen);
                        r = Math.round(r * lumen);
                        g = Math.round(g * lumen);
                        b = Math.round(b * lumen);
                        polygons.push({
                            points: [point1, point2, point3, point4],
                            color: polygon.rgbToHex(r, g, b),
                            distance: polygon.distance
                        });
                    }
                }
            });
            // отрисовка всех полигонов
            polygons.sort((a, b) => b.distance - a.distance);
            polygons.forEach(polygon => canvas.polygon(polygon.points, polygon.color));
        }
    }


    function printSubject(subject) {
        // нарисовать рёбра
        if (canPrint.edges) {
            for (let i = 0; i < subject.edges.length; i++) {
                const edge = subject.edges[i];
                const point1 = graph3D.getProection(subject.points[edge.p1]);
                const point2 = graph3D.getProection(subject.points[edge.p2]);
                canvas.line(point1.x, point1.y, point2.x, point2.y)
            }
        }

        //нарисовать точки
        if (canPrint.points) {
            for (let i = 0; i <= subject.points.length - 1; i++) {
                const points = graph3D.getProection(subject.points[i]);
                canvas.point(points.x, points.y);
            }
        }
    }

    function render() {
        canvas.clear();
        printAllPolygons();
        SCENE.forEach(subject => printSubject(subject));
        canvas.text(0, 19, "FPS: " + FPSout);
        canvas.render();
    }
	
    let FPS = 0;
    let FPSout = 0;
    timestamp = (new Date).getTime();
    (function animloop() {
        // Считаем FPS
        FPS++;
        const currentTimestamp = (new Date).getTime();
        if (currentTimestamp - timestamp >= 1000) {
            timestamp = currentTimestamp;
            FPSout = FPS;
            FPS = 0;

        }
        graph3D.calcPlaneEquation(); //Получить и записать плоскость экрана
        graph3D.calcWindowVectors(); //Вычислить поворот экрана
        // рисуем сцену
        render();
        requestAnimFrame(animloop);
    })();
};