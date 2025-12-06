class Solution {
public:
    int maxWidthOfVerticalArea(vector<vector<int>>& points) {
        int n = points.size();
        int ans = 0;
        std::sort(points.begin(), points.end());
        for(int i = 0;i < n - 1;i++){
            ans = max(ans, abs(points[i][0] - points[i + 1][0]));
        }
        return ans;
    }
};
