class Solution {
public:
    vector<int> vector_add(vector<int>& a, vector<int>& b){
        int n = a.size();
        vector<int> res(n, 0);
        int i = 0;
        for(i = 0;i < a.size();i++) {
            res[i] = a[i] + b[i];
            res[i] %= 3;
        }
        return res;
    }

    vector<int> int2vector(int x) {
        vector<int> ans(33, 0);
        if(x < 0){
            ans[32] = 1;
        }
        
        std::cout << x << " ";
        int idx = 0;
        while(x != 0) {
            ans[idx] = abs(x % 2);
            x /= 2;
            idx++;
        }
        
        // for(int i = 0;i < ans.size();i++){
        //     std::cout << ans[i];
        // }
        // std::cout << '\n';
        return ans;
    }

    int vector2int(vector<int>& a){
        int n = a.size();
        int res = 0;
        if(a[32] == 0) {
            for(int i = 0;i < n - 1;i++){
                res += a[i] * pow(2, i);
            }
        }
        else {
            for(int i = 0;i < n - 1;i++){
                res -= a[i] * pow(2, i);
            }
        }
        // for(int i = 0;i < n;i++){
        //     std::cout << a[i];
        // }
        // std::cout << " " << res;
        // std::cout << '\n';
        return res;
    }

    int singleNumber(vector<int>& nums) {
        int ans = 0;
        int n = nums.size();
        vector<int> result(33, 0);
        for(int i = 0;i < n;i++){
            vector<int> tmp = int2vector(nums[i]);
            result = vector_add(result, tmp);
        }
        ans = vector2int(result);
        return ans;
    }
};
