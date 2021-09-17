let subjectId = 0;

class Subject {
    constructor(points = [], edges = [], polygons = []) {
        this.id = ++subjectId;
        this.points = points;
        this.edges = edges;
        this.polygons = polygons;
    }
}